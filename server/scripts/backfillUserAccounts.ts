/**
 * One-shot backfill. Safe to re-run.
 *
 *   1. Canonicalise every existing `users.phone` to the digits-only form
 *      (matches the new lookup logic in findUserByIdentifier).
 *   2. For every `people` row that doesn't yet have a `userId`, provision
 *      a `users` row (or link to an existing one) via the same helper
 *      used by `people.create`.
 *
 * Available two ways:
 *   - CLI:  DATABASE_URL=... pnpm tsx server/scripts/backfillUserAccounts.ts
 *   - HTTP: POST /api/internal/backfill-users with x-bootstrap-secret header
 *           (see server/_core/index.ts)
 */

import { isNull, eq, isNotNull, and, ne } from "drizzle-orm";
import { getDb, provisionUserForPerson } from "../db";
import { people, users } from "../../drizzle/schema";
import { normalisePhone } from "../services/sms";

export interface BackfillResult {
  phoneCanonicalised: number;
  phoneAlreadyOk: number;
  phoneCollisions: { userId: string; oldPhone: string; canonical: string; collidesWith: string }[];
  orphansFound: number;
  newUsersCreated: number;
  reusedExisting: number;
  skipped: { personId: string; name: string; reason: string }[];
  links: { personId: string; name: string; userId: string; mode: "new" | "reused" }[];
}

/**
 * Run the backfill. Logs progress to stdout AND returns a structured
 * summary so the HTTP wrapper can hand it back as JSON.
 */
export async function runBackfillUserAccounts(): Promise<BackfillResult> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable; set DATABASE_URL");

  const result: BackfillResult = {
    phoneCanonicalised: 0,
    phoneAlreadyOk: 0,
    phoneCollisions: [],
    orphansFound: 0,
    newUsersCreated: 0,
    reusedExisting: 0,
    skipped: [],
    links: [],
  };

  // ─── Step 1: canonicalise users.phone ──────────────────────────────
  console.log("\n[1/2] canonicalising users.phone …");
  const allUsers = await db.select({ id: users.id, phone: users.phone }).from(users).where(isNotNull(users.phone));
  for (const u of allUsers) {
    if (!u.phone) continue;
    const canonical = normalisePhone(u.phone);
    if (canonical === u.phone) { result.phoneAlreadyOk++; continue; }

    // Don't blindly overwrite if the canonical form already exists on a
    // different user (would violate users.phone UNIQUE). Log + skip.
    const [collision] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.phone, canonical), ne(users.id, u.id))).limit(1);
    if (collision) {
      console.warn(`  collision: user ${u.id} phone "${u.phone}" canonical=${canonical} already on user ${collision.id} — skipping`);
      result.phoneCollisions.push({ userId: u.id, oldPhone: u.phone, canonical, collidesWith: collision.id });
      continue;
    }

    await db.update(users).set({ phone: canonical }).where(eq(users.id, u.id));
    console.log(`  user ${u.id}: "${u.phone}" → "${canonical}"`);
    result.phoneCanonicalised++;
  }
  console.log(`  done. fixed=${result.phoneCanonicalised} alreadyOk=${result.phoneAlreadyOk}`);

  // ─── Step 2: provision missing users rows for people ───────────────
  console.log("\n[2/2] linking people without a userId …");
  const orphans = await db.select().from(people).where(isNull(people.userId));
  result.orphansFound = orphans.length;
  console.log(`  found ${orphans.length} people without a users row`);

  for (const p of orphans) {
    if (!p.primaryPhone && !p.email) {
      console.warn(`  skip ${p.id} (${p.fullName}): no phone or email`);
      result.skipped.push({ personId: p.id, name: p.fullName, reason: "no phone or email" });
      continue;
    }

    const beforeCount = (await db.select({ id: users.id }).from(users)).length;

    const userId = await provisionUserForPerson({
      phone: p.primaryPhone ?? null,
      email: p.email ?? null,
      name: p.fullName,
    });
    if (!userId) {
      console.warn(`  skip ${p.id} (${p.fullName}): provisionUserForPerson returned undefined`);
      result.skipped.push({ personId: p.id, name: p.fullName, reason: "provisionUserForPerson returned undefined" });
      continue;
    }

    await db.update(people).set({ userId }).where(eq(people.id, p.id));
    const afterCount = (await db.select({ id: users.id }).from(users)).length;
    const mode: "new" | "reused" = afterCount > beforeCount ? "new" : "reused";
    if (mode === "new") result.newUsersCreated++; else result.reusedExisting++;
    result.links.push({ personId: p.id, name: p.fullName, userId, mode });
    console.log(`  linked ${p.id} (${p.fullName}) → user ${userId} [${mode}]`);
  }

  console.log(
    `\n  done. orphans=${result.orphansFound} ` +
    `newUsersCreated=${result.newUsersCreated} ` +
    `reusedExisting=${result.reusedExisting} ` +
    `skipped=${result.skipped.length}`,
  );
  return result;
}

// CLI entrypoint — only runs when invoked directly via `pnpm tsx …`.
async function cliMain() {
  await import("dotenv/config");
  const { closeDb } = await import("../db");
  try {
    await runBackfillUserAccounts();
    await closeDb();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

const isMainModule = process.argv[1]?.endsWith("backfillUserAccounts.ts")
  || process.argv[1]?.endsWith("backfillUserAccounts.js");

if (isMainModule) cliMain();
