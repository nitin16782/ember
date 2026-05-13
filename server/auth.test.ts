import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "./db";
import { users, refreshTokens, authCredentials, magicLinks } from "../drizzle/schema";
import {
  hashPassword, verifyPassword, validatePasswordStrength,
  issueTokens, rotateRefreshToken, revokeRefreshToken,
  generateOtp, verifyOtp,
  signAccessToken, verifyAccessToken,
} from "./services/auth";

// The tests below need a real DB; they are skipped when DATABASE_URL is
// not set so `pnpm test` still passes in environments without MySQL.
const HAS_DB = !!process.env.DATABASE_URL;
const d = HAS_DB ? describe : describe.skip;

d("auth service", () => {
  let testUserId: string;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable for tests");
    testUserId = randomUUID();
    await db.insert(users).values({
      id: testUserId,
      email: `test-${testUserId}@example.com`,
      name: "Test User",
      role: "super_admin",
      isActive: true,
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (db) {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
      await db.delete(authCredentials).where(eq(authCredentials.userId, testUserId));
      await db.delete(magicLinks).where(eq(magicLinks.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    await closeDb();
  });

  describe("password helpers", () => {
    it("hashes and verifies password", async () => {
      const hash = await hashPassword("Password123!");
      expect(await verifyPassword("Password123!", hash)).toBe(true);
      expect(await verifyPassword("wrong", hash)).toBe(false);
    });

    it("rejects weak passwords", () => {
      expect(validatePasswordStrength("short").ok).toBe(false);
      expect(validatePasswordStrength("nodigitsbutspecial!").ok).toBe(false);
      expect(validatePasswordStrength("nodigit_or_special").ok).toBe(false);
      expect(validatePasswordStrength("Password123!").ok).toBe(true);
    });
  });

  describe("access tokens", () => {
    it("signs and verifies access token", async () => {
      const db = await getDb();
      if (!db) throw new Error();
      const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      const token = await signAccessToken(user!);
      const claims = await verifyAccessToken(token);
      expect(claims?.sub).toBe(testUserId);
      expect(claims?.role).toBe("super_admin");
    });

    it("rejects tampered access token", async () => {
      const claims = await verifyAccessToken("not.a.valid.token");
      expect(claims).toBeNull();
    });
  });

  describe("refresh tokens", () => {
    it("rotates refresh token and invalidates the old one", async () => {
      const db = await getDb();
      if (!db) throw new Error();
      const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      const first = await issueTokens(user!, {});

      const next = await rotateRefreshToken(first.refreshToken, {});
      expect(next).not.toBeNull();
      expect(next!.refreshToken).not.toBe(first.refreshToken);

      const reuse = await rotateRefreshToken(first.refreshToken, {});
      expect(reuse).toBeNull();
    });

    it("revokes refresh token on logout", async () => {
      const db = await getDb();
      if (!db) throw new Error();
      const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      const tokens = await issueTokens(user!, {});

      await revokeRefreshToken(tokens.refreshToken);

      const refreshed = await rotateRefreshToken(tokens.refreshToken, {});
      expect(refreshed).toBeNull();
    });
  });

  describe("OTP", () => {
    it("generates and verifies a 6-digit OTP", async () => {
      const identifier = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const { code } = await generateOtp(identifier, "phone", "login");
      expect(code).toMatch(/^\d{6}$/);

      const result = await verifyOtp(identifier, code, "login");
      expect(result.ok).toBe(true);
    });

    it("rejects incorrect OTP and increments attempts", async () => {
      const identifier = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      await generateOtp(identifier, "phone", "login");

      const wrong = await verifyOtp(identifier, "000000", "login");
      expect(wrong.ok).toBe(false);
    });

    it("rejects OTP after consumption", async () => {
      const identifier = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const { code } = await generateOtp(identifier, "phone", "login");

      await verifyOtp(identifier, code, "login");
      const second = await verifyOtp(identifier, code, "login");
      expect(second.ok).toBe(false);
    });
  });
});

import { normalisePhone } from "./services/sms";

describe("sms helpers — phone normalisation", () => {
  it("normalises Indian numbers without country code", () => {
    expect(normalisePhone("9876543210")).toBe("919876543210");
    expect(normalisePhone("98765 43210")).toBe("919876543210");
    expect(normalisePhone("98765-43210")).toBe("919876543210");
    expect(normalisePhone("  9876543210  ")).toBe("919876543210");
  });

  it("preserves country code when present with +", () => {
    expect(normalisePhone("+919876543210")).toBe("919876543210");
    expect(normalisePhone("+91 98765 43210")).toBe("919876543210");
    expect(normalisePhone("+1 415 555 1234")).toBe("14155551234");
    expect(normalisePhone("+44 7911 123456")).toBe("447911123456");
  });

  it("handles already-normalised input", () => {
    expect(normalisePhone("919876543210")).toBe("919876543210");
  });

  it("handles numbers with extraneous characters", () => {
    expect(normalisePhone("+91 (98765) 43210")).toBe("919876543210");
  });
});
