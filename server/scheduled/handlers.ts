/**
 * Scheduled Job Handlers
 *
 * Wired to node-cron in Prompt 7. Each handler is invoked via HTTP POST
 * with a shared-secret header (`x-ember-cron-secret`) so they can also
 * be triggered manually from operations.
 *
 * Jobs:
 *   1. idCardExpiry — daily check for expired ID cards
 *   2. referralMilestones — daily check for 30-day and 90-day referral milestones
 *   3. abscondingDetection — daily check for associates absent without leave
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import { idCards, referrals, shiftEvents, people, leaveApplications } from "../../drizzle/schema";
import { eq, lt, and, sql, isNull } from "drizzle-orm";

function verifyCronCall(req: Request, res: Response): boolean {
  const header = req.headers["x-ember-cron-secret"];
  const expected = process.env.CRON_SHARED_SECRET ?? "";
  if (!expected || header !== expected) {
    res.status(403).json({ error: "cron-only" });
    return false;
  }
  return true;
}

/**
 * ID Card Auto-Expiry Handler
 * Runs daily to mark expired ID cards as "expired" based on validUntil date.
 */
export async function idCardExpiryHandler(req: Request, res: Response) {
  if (!verifyCronCall(req, res)) return;
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

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

    let updatedCount = 0;
    for (const card of expiredCards) {
      await db
        .update(idCards)
        .set({ status: "expired" })
        .where(eq(idCards.id, card.id));
      updatedCount++;
    }

    console.log(`[Scheduled] ID Card Expiry: ${updatedCount} cards expired`);
    res.json({ ok: true, expiredCount: updatedCount, checkedAt: new Date().toISOString() });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Scheduled] ID Card Expiry error:", err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Referral Bounty Milestone Tracker
 * Runs daily to check if referred candidates have hit 30-day or 90-day milestones.
 * Updates tranche payment dates when milestones are reached.
 */
export async function referralMilestonesHandler(req: Request, res: Response) {
  if (!verifyCronCall(req, res)) return;
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

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

    let tranche1Count = 0;
    for (const ref of tranche1Eligible) {
      await db
        .update(referrals)
        .set({ tranche1PaidAt: now })
        .where(eq(referrals.id, ref.id));
      tranche1Count++;
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

    let tranche2Count = 0;
    for (const ref of tranche2Eligible) {
      await db
        .update(referrals)
        .set({ tranche2PaidAt: now })
        .where(eq(referrals.id, ref.id));
      tranche2Count++;
    }

    console.log(`[Scheduled] Referral Milestones: ${tranche1Count} tranche1, ${tranche2Count} tranche2`);
    res.json({
      ok: true,
      tranche1Paid: tranche1Count,
      tranche2Paid: tranche2Count,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Scheduled] Referral Milestones error:", err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Absconding Detection Handler
 * Runs daily to flag associates who haven't checked in for 3+ consecutive days
 * without an approved leave application.
 */
export async function abscondingDetectionHandler(req: Request, res: Response) {
  if (!verifyCronCall(req, res)) return;
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

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
    res.json({
      ok: true,
      flaggedCount: flagged.length,
      flagged,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Scheduled] Absconding Detection error:", err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
