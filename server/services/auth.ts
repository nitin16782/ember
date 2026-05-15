import { randomUUID, randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq, and, gt, isNull, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  users, authCredentials, otpCodes, refreshTokens, magicLinks,
  type User,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

// ─── JWT helpers ────────────────────────────────────────────────────

const encoder = new TextEncoder();
const secret = () => encoder.encode(ENV.jwtSecret);

export interface AccessTokenClaims {
  sub: string;
  role: string;
  type: "access";
}

export async function signAccessToken(user: User): Promise<string> {
  return await new SignJWT({ role: user.role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ENV.jwtAccessTtlSeconds}s`)
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.type !== "access" || !payload.sub) return null;
    return { sub: payload.sub as string, role: payload.role as string, type: "access" };
  } catch {
    return null;
  }
}

// ─── Refresh token helpers ──────────────────────────────────────────

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  expiresAt: Date;
}

export async function issueTokens(
  user: User,
  ctx: { userAgent?: string; ip?: string }
): Promise<IssuedTokens> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const rawRefresh = randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + ENV.jwtRefreshTtlSeconds * 1000);
  const id = randomUUID();

  await db.insert(refreshTokens).values({
    id,
    userId: user.id,
    tokenHash,
    userAgent: ctx.userAgent?.slice(0, 512) ?? null,
    ip: ctx.ip ?? null,
    expiresAt,
  });

  const accessToken = await signAccessToken(user);

  await db.update(users)
    .set({ lastSignedInAt: new Date() })
    .where(eq(users.id, user.id));

  return { accessToken, refreshToken: rawRefresh, refreshTokenId: id, expiresAt };
}

export async function rotateRefreshToken(
  rawToken: string,
  ctx: { userAgent?: string; ip?: string }
): Promise<IssuedTokens | null> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const tokenHash = hashToken(rawToken);
  const [row] = await db.select().from(refreshTokens)
    .where(and(
      eq(refreshTokens.tokenHash, tokenHash),
      isNull(refreshTokens.revokedAt),
      gt(refreshTokens.expiresAt, new Date()),
    ))
    .limit(1);

  if (!row) {
    // Reuse detection: if the token exists but is revoked, this is a
    // reuse attempt — revoke all tokens for the user as a precaution.
    const [revoked] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    if (revoked) {
      await db.update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, revoked.userId));
    }
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || !user.isActive) return null;

  const next = await issueTokens(user, ctx);

  await db.update(refreshTokens)
    .set({
      revokedAt: new Date(),
      rotatedToId: next.refreshTokenId,
      lastUsedAt: new Date(),
    })
    .where(eq(refreshTokens.id, row.id));

  return next;
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const tokenHash = hashToken(rawToken);
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

// ─── Password helpers ───────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ENV.bcryptRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validatePasswordStrength(password: string): { ok: true } | { ok: false; reason: string } {
  if (password.length < 10) return { ok: false, reason: "Password must be at least 10 characters" };
  if (!/[0-9]/.test(password)) return { ok: false, reason: "Password must include a digit" };
  if (!/[^a-zA-Z0-9]/.test(password)) return { ok: false, reason: "Password must include a special character" };
  return { ok: true };
}

// Associates sign in with a 6-digit numeric PIN — chosen over an
// alphanumeric password because many housekeepers work from shared
// devices on cheap keypads where typing accuracy is the bottleneck.
// Reject trivial sequences and repeats so the convenience doesn't
// turn into "everyone picks 000000".
const PIN_LENGTH = 6;
const TRIVIAL_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444", "555555",
  "666666", "777777", "888888", "999999",
  "012345", "123456", "234567", "345678", "456789", "567890",
  "098765", "987654", "876543", "765432", "654321", "543210",
]);
export function validatePin(pin: string): { ok: true } | { ok: false; reason: string } {
  if (pin.length !== PIN_LENGTH) return { ok: false, reason: `PIN must be exactly ${PIN_LENGTH} digits` };
  if (!/^\d+$/.test(pin)) return { ok: false, reason: "PIN must be digits only" };
  if (TRIVIAL_PINS.has(pin)) return { ok: false, reason: "Choose a less guessable PIN" };
  return { ok: true };
}

// ─── OTP helpers ────────────────────────────────────────────────────

const OTP_EXPIRY_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;

export async function generateOtp(
  identifier: string,
  identifierType: "phone" | "email",
  purpose: "login" | "password_reset" | "phone_verify" | "email_verify"
): Promise<{ otpId: string; code: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);
  const id = randomUUID();

  // Invalidate any previous unused OTPs for the same identifier+purpose
  await db.update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(otpCodes.identifier, identifier),
      eq(otpCodes.purpose, purpose),
      isNull(otpCodes.consumedAt),
    ));

  await db.insert(otpCodes).values({
    id, identifier, identifierType, codeHash, purpose, expiresAt,
  });

  return { otpId: id, code, expiresAt };
}

export async function verifyOtp(
  identifier: string,
  code: string,
  purpose: "login" | "password_reset" | "phone_verify" | "email_verify"
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [row] = await db.select().from(otpCodes)
    .where(and(
      eq(otpCodes.identifier, identifier),
      eq(otpCodes.purpose, purpose),
      isNull(otpCodes.consumedAt),
      gt(otpCodes.expiresAt, new Date()),
    ))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!row) return { ok: false, reason: "No active code; please request a new one" };

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await db.update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(eq(otpCodes.id, row.id));
    return { ok: false, reason: "Too many attempts; please request a new code" };
  }

  const codeHash = hashToken(code);
  if (codeHash !== row.codeHash) {
    await db.update(otpCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(otpCodes.id, row.id));
    return { ok: false, reason: "Incorrect code" };
  }

  await db.update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodes.id, row.id));
  return { ok: true };
}

// ─── Magic link helpers ─────────────────────────────────────────────

const MAGIC_EXPIRY_MIN = 15;

export async function generateMagicLink(
  userId: string,
  purpose: "login" | "first_login_setup" = "login"
): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_EXPIRY_MIN * 60 * 1000);

  await db.insert(magicLinks).values({
    id: randomUUID(),
    userId,
    tokenHash,
    purpose,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function consumeMagicLink(token: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  const tokenHash = hashToken(token);
  const [row] = await db.select().from(magicLinks)
    .where(and(
      eq(magicLinks.tokenHash, tokenHash),
      isNull(magicLinks.consumedAt),
      gt(magicLinks.expiresAt, new Date()),
    ))
    .limit(1);

  if (!row) return null;

  await db.update(magicLinks)
    .set({ consumedAt: new Date() })
    .where(eq(magicLinks.id, row.id));

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || !user.isActive) return null;
  return user;
}

// ─── Account lockout (failed login attempts) ────────────────────────

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export async function recordFailedLogin(userId: string): Promise<{ locked: boolean }> {
  const db = await getDb();
  if (!db) return { locked: false };

  const [cred] = await db.select().from(authCredentials)
    .where(eq(authCredentials.userId, userId)).limit(1);
  if (!cred) return { locked: false };

  const newAttempts = cred.failedAttempts + 1;
  const update: { failedAttempts: number; lockedUntil?: Date } = { failedAttempts: newAttempts };
  if (newAttempts >= MAX_FAILED_LOGINS) {
    update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
  }

  await db.update(authCredentials)
    .set(update)
    .where(eq(authCredentials.userId, userId));

  return { locked: newAttempts >= MAX_FAILED_LOGINS };
}

export async function clearFailedLogins(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(authCredentials)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(authCredentials.userId, userId));
}

export async function isAccountLocked(userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [cred] = await db.select().from(authCredentials)
    .where(eq(authCredentials.userId, userId)).limit(1);
  if (!cred?.lockedUntil) return false;
  return cred.lockedUntil > new Date();
}
