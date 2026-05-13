/**
 * Scheduled Job — pure job functions.
 *
 * These run on schedule from node-cron (server/jobs/scheduler.ts) and
 * can also be triggered manually via POST /api/scheduled/<name>
 * (Express handlers built by scheduler.buildHttpTrigger).
 *
 * Jobs:
 *   1. idCardExpiry — daily check for expired ID cards
 *   2. referralMilestones — daily check for 30-day and 90-day referral milestones
 *   3. abscondingDetection — daily check for associates absent without leave
 */

import { eq, lt, and, sql, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { idCards, referrals, shiftEvents, people, leaveApplications } from "../../drizzle/schema";

// ─── Pure job functions ─────────────────────────────────────────────

/**
 * Mark ID cards past validUntil as expired.
 * Idempotent: only flips rows still in "active" status.
 */
export async function idCardExpiryJob(): Promise<{ expiredCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const today = new Date().toISOString().split("T")[0];
  const expiredCards = await db
    .select({ id: idCards.id, cardNumber: idCards.cardNumber, personId: idCards.personId })
    .from(idCards)
    .where(
      and(
        eq(idCards.status, "active"),
        lt(idCards.validUntil, new Date(today))
      )
    );

  let expiredCount = 0;
  for (const card of expiredCards) {
    await db
      .update(idCards)
      .set({ status: "expired" })
      .where(eq(idCards.id, card.id));
    expiredCount++;
  }

  console.log(`[Scheduled] ID Card Expiry: ${expiredCount} cards expired`);
  return { expiredCount };
}

/**
 * Pay referral bounty tranches when 30-day and 90-day milestones are hit.
 * Idempotent: only touches referrals whose corresponding tranche timestamp
 * is still null.
 */
export async function referralMilestonesJob(): Promise<{ tranche1Paid: number; tranche2Paid: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const tranche1Eligible = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.status, "converted"),
        isNull(referrals.tranche1PaidAt),
        lt(referrals.referredAt, thirtyDaysAgo)
      )
    );

  let tranche1Paid = 0;
  for (const ref of tranche1Eligible) {
    await db
      .update(referrals)
      .set({ tranche1PaidAt: now })
      .where(eq(referrals.id, ref.id));
    tranche1Paid++;
  }

  const tranche2Eligible = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.status, "converted"),
        isNull(referrals.tranche2PaidAt),
        lt(referrals.referredAt, ninetyDaysAgo)
      )
    );

  let tranche2Paid = 0;
  for (const ref of tranche2Eligible) {
    await db
      .update(referrals)
      .set({ tranche2PaidAt: now })
      .where(eq(referrals.id, ref.id));
    tranche2Paid++;
  }

  console.log(`[Scheduled] Referral Milestones: ${tranche1Paid} tranche1, ${tranche2Paid} tranche2`);
  return { tranche1Paid, tranche2Paid };
}

/**
 * Flag active associates with no check-in in the last 3 days and no
 * approved leave covering today.
 *
 * The actual flagging into people.employmentStatus is intentionally
 * deferred — for now we log the candidate list. A later prompt will
 * decide whether to auto-set status="absconding" or surface the list
 * to ops for human review (auto-flagging is a destructive action that
 * blocks attendance / payroll).
 */
export async function abscondingDetectionJob(): Promise<{
  flaggedCount: number;
  flagged: Array<{ personId: string; name: string; lastCheckIn: string | null }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const activePeople = await db
    .select({ id: people.id, fullName: people.fullName })
    .from(people)
    .where(eq(people.employmentStatus, "active"));

  const flagged: Array<{ personId: string; name: string; lastCheckIn: string | null }> = [];

  for (const person of activePeople) {
    const recentEvents = await db
      .select({ id: shiftEvents.id, occurredAt: shiftEvents.occurredAt })
      .from(shiftEvents)
      .where(
        and(
          eq(shiftEvents.personId, person.id),
          eq(shiftEvents.eventType, "check_in"),
          sql`${shiftEvents.occurredAt} >= ${threeDaysAgo}`
        )
      )
      .limit(1);

    if (recentEvents.length === 0) {
      const today = now.toISOString().split("T")[0];
      const approvedLeave = await db
        .select({ id: leaveApplications.id })
        .from(leaveApplications)
        .where(
          and(
            eq(leaveApplications.personId, person.id),
            eq(leaveApplications.status, "approved"),
            sql`${leaveApplications.fromDate} <= ${today}`,
            sql`${leaveApplications.toDate} >= ${today}`
          )
        )
        .limit(1);

      if (approvedLeave.length === 0) {
        const lastEvent = await db
          .select({ occurredAt: shiftEvents.occurredAt })
          .from(shiftEvents)
          .where(
            and(
              eq(shiftEvents.personId, person.id),
              eq(shiftEvents.eventType, "check_in")
            )
          )
          .orderBy(sql`${shiftEvents.occurredAt} DESC`)
          .limit(1);

        flagged.push({
          personId: person.id,
          name: person.fullName,
          lastCheckIn: lastEvent[0]?.occurredAt?.toISOString() || null,
        });
      }
    }
  }

  console.log(`[Scheduled] Absconding Detection: ${flagged.length} associates flagged`);
  return { flaggedCount: flagged.length, flagged };
}

// HTTP triggers are built by scheduler.buildHttpTrigger and mounted in
// server/_core/index.ts. Routing them through the scheduler means manual
// fires share the same wrapHandler logging + status tracking as the
// scheduled fires.
