/**
 * One-shot backfill: provision a `users` row for every `people` row
 * that doesn't have one yet, and link `people.userId` to it.
 *
 * Safe to run repeatedly — uses provisionUserForPerson which is
 * idempotent. Run after deploy with:
 *
 *   DATABASE_URL=... pnpm tsx server/scripts/backfillUserAccounts.ts
 *
 * Behaviour:
 *   - People with no primaryPhone AND no email are skipped (can't log in)
 *   - People whose phone or email collides with an existing users row
 *     are linked to that row (no duplicate)
 *   - Prints a summary at the end
 */

import "dotenv/config";
import { isNull, eq } from "drizzle-orm";
import { getDb, closeDb, provisionUserForPerson } from "../db";
import { people } from "../../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB unavailable; set DATABASE_URL");
    process.exit(1);
  }

  const orphans = await db.select().from(people).where(isNull(people.userId));
  console.log(`Found ${orphans.length} people without a users row`);

  let linked = 0;
  let created = 0;
  let skipped = 0;

  for (const p of orphans) {
    if (!p.primaryPhone && !p.email) {
      console.warn(`  skip ${p.id} (${p.fullName}): no phone or email`);
      skipped++;
      continue;
    }

    const before = await provisionUserForPerson({
      phone: p.primaryPhone ?? null,
      email: p.email ?? null,
      name: p.fullName,
    });
    if (!before) {
      console.warn(`  skip ${p.id} (${p.fullName}): provisionUserForPerson returned undefined`);
      skipped++;
      continue;
    }

    await db.update(people).set({ userId: before }).where(eq(people.id, p.id));
    console.log(`  linked ${p.id} (${p.fullName}) → user ${before}`);

    // Heuristic: if the user we got back was created in this call, count
    // it as created; otherwise count as linked-to-existing. Cheap proxy:
    // if there's exactly one person now pointing at this userId, it's
    // newly minted by us.
    const refs = await db.select({ id: people.id }).from(people).where(eq(people.userId, before));
    if (refs.length === 1) created++;
    else linked++;
  }

  console.log(
    `\nDone. orphans=${orphans.length} ` +
    `newUsersCreated~=${created} reusedExisting~=${linked} skipped=${skipped}`,
  );
  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
