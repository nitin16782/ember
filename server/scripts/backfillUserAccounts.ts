/**
 * One-shot backfill. Safe to re-run.
 *
 *   1. Canonicalise every existing `users.phone` to the digits-only form
 *      (matches the new lookup logic in findUserByIdentifier).
 *   2. For every `people` row that doesn't yet have a `userId`, provision
 *      a `users` row (or link to an existing one) via the same helper
 *      used by `people.create`.
 *
 * Run after deploy with:
 *
 *   DATABASE_URL=... pnpm tsx server/scripts/backfillUserAccounts.ts
 */

import "dotenv/config";
import { isNull, eq, isNotNull, and, ne } from "drizzle-orm";
import { getDb, closeDb, provisionUserForPerson } from "../db";
import { people, users } from "../../drizzle/schema";
import { normalisePhone } from "../services/sms";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB unavailable; set DATABASE_URL");
    process.exit(1);
  }

  // ─── Step 1: canonicalise users.phone ──────────────────────────────
  console.log("\n[1/2] canonicalising users.phone …");
  const allUsers = await db.select({ id: users.id, phone: users.phone }).from(users).where(isNotNull(users.phone));
  let phoneFixed = 0;
  let phoneOk = 0;
  for (const u of allUsers) {
    if (!u.phone) continue;
    const canonical = normalisePhone(u.phone);
    if (canonical === u.phone) { phoneOk++; continue; }

    // Don't blindly overwrite if the canonical form already exists on a
    // different user (would violate users.phone UNIQUE). Log + skip.
    const [collision] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.phone, canonical), ne(users.id, u.id))).limit(1);
    if (collision) {
      console.warn(`  collision: user ${u.id} phone "${u.phone}" canonical=${canonical} already on user ${collision.id} — skipping`);
      continue;
    }

    await db.update(users).set({ phone: canonical }).where(eq(users.id, u.id));
    console.log(`  user ${u.id}: "${u.phone}" → "${canonical}"`);
    phoneFixed++;
  }
  console.log(`  done. fixed=${phoneFixed} alreadyOk=${phoneOk}`);

  // ─── Step 2: provision missing users rows for people ───────────────
  console.log("\n[2/2] linking people without a userId …");
  const orphans = await db.select().from(people).where(isNull(people.userId));
  console.log(`  found ${orphans.length} people without a users row`);

  let linked = 0;
  let created = 0;
  let skipped = 0;

  for (const p of orphans) {
    if (!p.primaryPhone && !p.email) {
      console.warn(`  skip ${p.id} (${p.fullName}): no phone or email`);
      skipped++;
      continue;
    }

    const beforeUsers = await db.select({ id: users.id }).from(users);
    const beforeCount = beforeUsers.length;

    const userId = await provisionUserForPerson({
      phone: p.primaryPhone ?? null,
      email: p.email ?? null,
      name: p.fullName,
    });
    if (!userId) {
      console.warn(`  skip ${p.id} (${p.fullName}): provisionUserForPerson returned undefined`);
      skipped++;
      continue;
    }

    await db.update(people).set({ userId }).where(eq(people.id, p.id));
    const afterCount = (await db.select({ id: users.id }).from(users)).length;
    if (afterCount > beforeCount) created++; else linked++;
    console.log(`  linked ${p.id} (${p.fullName}) → user ${userId} ${afterCount > beforeCount ? "[new]" : "[reused]"}`);
  }

  console.log(
    `\n  done. orphans=${orphans.length} ` +
    `newUsersCreated=${created} reusedExisting=${linked} skipped=${skipped}`,
  );
  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
