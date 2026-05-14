import { randomUUID } from "crypto";
import { eq, desc, and, gte, lte, sql, like, or, count } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import {
  InsertUser, users, people, properties, owners,
  assignments, shiftEvents, leaveApplications, leaveBalances, leavePolicies,
  payrollRuns, payrollLines,
  requisitions, candidates, requisitionCandidates, onboardingChecklists, contracts, contractTemplates,
  trainingModules, trainingCompletions, feedback, performanceReviews,
  exits, idCards, referrals, dailyChecklists, breakages,
  expenses, vendors, workOrders, inventoryItems, bookings,
  invoices, payments, requests, monthlyReports,
  notifications, auditLog, feeStructures, slas,
  type InsertPerson,
} from "../drizzle/schema";

let _pool: Pool | null = null;
let _db: MySql2Database | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = createPool(process.env.DATABASE_URL);
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

function newId(): string {
  return randomUUID();
}

export async function upsertUser(user: InsertUser): Promise<string | undefined> {
  if (!user.email) throw new Error("User email is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const id = user.id ?? newId();
    const values: InsertUser = { id, email: user.email };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "phone"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedInAt !== undefined) { values.lastSignedInAt = user.lastSignedInAt; updateSet.lastSignedInAt = user.lastSignedInAt; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedInAt) values.lastSignedInAt = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedInAt = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
    return id;
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Audit Log ──────────────────────────────────────────────────────
export async function writeAuditLog(entry: {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  reasonCode?: string | null;
  reasonNote?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values({
    id: newId(),
    actorId: entry.actorId ?? null,
    actorRole: entry.actorRole ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    beforeValue: entry.beforeValue ?? null,
    afterValue: entry.afterValue ?? null,
    reasonCode: entry.reasonCode ?? null,
    reasonNote: entry.reasonNote ?? null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
  });
}

export async function getAuditLogs(opts: { entityType?: string; entityId?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts.entityType) conditions.push(eq(auditLog.entityType, opts.entityType));
  if (opts.entityId) conditions.push(eq(auditLog.entityId, opts.entityId));
  const query = db.select().from(auditLog);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(auditLog.occurredAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

// ─── People ─────────────────────────────────────────────────────────
export async function listPeople(opts?: { status?: string; staffType?: string; search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.status) conditions.push(eq(people.employmentStatus, opts.status as any));
  if (opts?.staffType) conditions.push(eq(people.staffType, opts.staffType as any));
  if (opts?.search) conditions.push(or(like(people.fullName, `%${opts.search}%`), like(people.primaryPhone, `%${opts.search}%`)));
  const query = db.select().from(people);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(people.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function getPersonById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return result[0];
}

export async function createPerson(data: InsertPerson) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(people).values({ ...data, id });
  return id;
}

export async function updatePerson(id: string, data: Partial<InsertPerson>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(people).set(data).where(eq(people.id, id));
}

export async function deletePerson(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(people).where(eq(people.id, id));
}

export async function getPeopleStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, onLeave: 0, exited: 0 };
  const rows = await db.select({ status: people.employmentStatus, cnt: count() }).from(people).groupBy(people.employmentStatus);
  const stats = { total: 0, active: 0, onLeave: 0, exited: 0, absconding: 0 };
  rows.forEach((r) => {
    const c = Number(r.cnt);
    stats.total += c;
    if (r.status === "active") stats.active = c;
    else if (r.status === "on_leave") stats.onLeave = c;
    else if (r.status === "exited") stats.exited = c;
    else if (r.status === "absconding") stats.absconding = c;
  });
  return stats;
}

// ─── Properties ─────────────────────────────────────────────────────
export async function listProperties(opts?: { status?: string; search?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.status) conditions.push(eq(properties.status, opts.status as any));
  if (opts?.search) conditions.push(or(like(properties.name, `%${opts.search}%`), like(properties.city, `%${opts.search}%`)));
  const query = db.select().from(properties);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(properties.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function getPropertyById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result[0];
}

export async function createProperty(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(properties).values({ ...data, id });
  return id;
}

export async function updateProperty(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(properties).set(data).where(eq(properties.id, id));
}

export async function getPropertyStats() {
  const db = await getDb();
  if (!db) return { total: 0, live: 0, onboarding: 0, paused: 0, churned: 0 };
  const rows = await db.select({ status: properties.status, cnt: count() }).from(properties).groupBy(properties.status);
  const stats = { total: 0, live: 0, onboarding: 0, paused: 0, churned: 0 };
  rows.forEach((r) => {
    const c = Number(r.cnt);
    stats.total += c;
    if (r.status === "live") stats.live = c;
    else if (r.status === "onboarding") stats.onboarding = c;
    else if (r.status === "paused") stats.paused = c;
    else if (r.status === "churned") stats.churned = c;
  });
  return stats;
}

// ─── Owners ─────────────────────────────────────────────────────────
export async function listOwners(opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(owners).orderBy(desc(owners.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function createOwner(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(owners).values({ ...data, id });
  return id;
}

// ─── Assignments ────────────────────────────────────────────────────
export async function listAssignments(opts?: { propertyId?: string; personId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(assignments.propertyId, opts.propertyId));
  if (opts?.personId) conditions.push(eq(assignments.personId, opts.personId));
  if (opts?.status) conditions.push(eq(assignments.status, opts.status as any));
  const query = db.select().from(assignments);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(assignments.createdAt)).limit(opts?.limit ?? 100);
}

export async function createAssignment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(assignments).values({ ...data, id });
  return id;
}

// ─── Attendance ─────────────────────────────────────────────────────
export async function listShiftEvents(opts?: { personId?: string; propertyId?: string; from?: Date; to?: Date; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(shiftEvents.personId, opts.personId));
  if (opts?.propertyId) conditions.push(eq(shiftEvents.propertyId, opts.propertyId));
  if (opts?.from) conditions.push(gte(shiftEvents.occurredAt, opts.from));
  if (opts?.to) conditions.push(lte(shiftEvents.occurredAt, opts.to));
  const query = db.select().from(shiftEvents);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(shiftEvents.occurredAt)).limit(opts?.limit ?? 200);
}

export async function createShiftEvent(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(shiftEvents).values({ ...data, id });
  return id;
}

// ─── Leave ──────────────────────────────────────────────────────────
export async function listLeaveApplications(opts?: { personId?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(leaveApplications.personId, opts.personId));
  if (opts?.status) conditions.push(eq(leaveApplications.status, opts.status as any));
  const query = db.select().from(leaveApplications);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(leaveApplications.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function createLeaveApplication(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(leaveApplications).values({ ...data, id });
  return id;
}

export async function updateLeaveApplication(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leaveApplications).set(data).where(eq(leaveApplications.id, id));
}

export async function listLeavePolicies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leavePolicies).where(eq(leavePolicies.active, true));
}

export async function getLeaveBalances(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leaveBalances).where(eq(leaveBalances.personId, personId));
}

// ─── Payroll ────────────────────────────────────────────────────────
export async function listPayrollRuns(opts?: { limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payrollRuns).orderBy(desc(payrollRuns.createdAt)).limit(opts?.limit ?? 20);
}

export async function getPayrollLines(runId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payrollLines).where(eq(payrollLines.payrollRunId, runId));
}

export async function createPayrollRun(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(payrollRuns).values({ ...data, id });
  return id;
}

// ─── Hiring ─────────────────────────────────────────────────────────
export async function listRequisitions(opts?: { status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.status) conditions.push(eq(requisitions.status, opts.status as any));
  const query = db.select().from(requisitions);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(requisitions.createdAt)).limit(opts?.limit ?? 50);
}

export async function createRequisition(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(requisitions).values({ ...data, id });
  return id;
}

// Candidates are now linked to requisitions through the requisition_candidates pivot.
// When a requisitionId is supplied, list candidates that have a link to that requisition.
export async function listCandidates(opts?: { requisitionId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 50;
  if (opts?.requisitionId) {
    const rows = await db
      .select()
      .from(candidates)
      .innerJoin(requisitionCandidates, eq(candidates.id, requisitionCandidates.candidateId))
      .where(
        opts.status
          ? and(
              eq(requisitionCandidates.requisitionId, opts.requisitionId),
              eq(candidates.status, opts.status as any),
            )
          : eq(requisitionCandidates.requisitionId, opts.requisitionId),
      )
      .orderBy(desc(candidates.createdAt))
      .limit(limit);
    return rows.map((r: any) => r.candidates);
  }
  const conditions = [];
  if (opts?.status) conditions.push(eq(candidates.status, opts.status as any));
  const query = db.select().from(candidates);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(candidates.createdAt)).limit(limit);
}

export async function createCandidate(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(candidates).values({ ...data, id });
  return id;
}

export async function updateCandidate(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(candidates).set(data).where(eq(candidates.id, id));
}

export async function linkCandidateToRequisition(opts: {
  requisitionId: string;
  candidateId: string;
  notes?: string;
  stageChangedBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = newId();
  await db.insert(requisitionCandidates).values({
    id,
    requisitionId: opts.requisitionId,
    candidateId: opts.candidateId,
    notes: opts.notes,
    stageChangedBy: opts.stageChangedBy,
  });
  return id;
}

export async function updateRequisitionCandidateStage(opts: {
  id: string;
  newStage: any;
  notes?: string;
  stageChangedBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(requisitionCandidates)
    .set({
      stage: opts.newStage,
      stageChangedAt: new Date(),
      stageChangedBy: opts.stageChangedBy,
      notes: opts.notes,
    })
    .where(eq(requisitionCandidates.id, opts.id));
}

export async function candidatesForRequisition(requisitionId: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(requisitionCandidates)
    .innerJoin(candidates, eq(requisitionCandidates.candidateId, candidates.id))
    .where(eq(requisitionCandidates.requisitionId, requisitionId))
    .orderBy(desc(requisitionCandidates.stageChangedAt));
  return rows.map((r: any) => ({
    link: r.requisition_candidates,
    candidate: r.candidates,
  }));
}

// ─── Expenses ───────────────────────────────────────────────────────
export async function listExpenses(opts?: { propertyId?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(expenses.propertyId, opts.propertyId));
  if (opts?.status) conditions.push(eq(expenses.status, opts.status as any));
  const query = db.select().from(expenses);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(expenses.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function createExpense(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(expenses).values({ ...data, id });
  return id;
}

export async function updateExpense(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

// ─── Vendors ────────────────────────────────────────────────────────
export async function listVendors(opts?: { status?: string; search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.status) conditions.push(eq(vendors.status, opts.status as any));
  if (opts?.search) conditions.push(like(vendors.name, `%${opts.search}%`));
  const query = db.select().from(vendors);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(vendors.createdAt)).limit(opts?.limit ?? 50);
}

export async function createVendor(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(vendors).values({ ...data, id });
  return id;
}

export async function listWorkOrders(opts?: { propertyId?: string; vendorId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(workOrders.propertyId, opts.propertyId));
  if (opts?.vendorId) conditions.push(eq(workOrders.vendorId, opts.vendorId));
  if (opts?.status) conditions.push(eq(workOrders.status, opts.status as any));
  const query = db.select().from(workOrders);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(workOrders.createdAt)).limit(opts?.limit ?? 50);
}

export async function createWorkOrder(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(workOrders).values({ ...data, id });
  return id;
}

// ─── Inventory ──────────────────────────────────────────────────────
export async function listInventoryItems(opts?: { propertyId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(inventoryItems.propertyId, opts.propertyId));
  const query = db.select().from(inventoryItems);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(inventoryItems.createdAt)).limit(opts?.limit ?? 100);
}

export async function createInventoryItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(inventoryItems).values({ ...data, id });
  return id;
}

// ─── Bookings ───────────────────────────────────────────────────────
export async function listBookings(opts?: { propertyId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(bookings.propertyId, opts.propertyId));
  if (opts?.status) conditions.push(eq(bookings.status, opts.status as any));
  const query = db.select().from(bookings);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(bookings.createdAt)).limit(opts?.limit ?? 50);
}

export async function createBooking(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(bookings).values({ ...data, id });
  return id;
}

// ─── Invoices ───────────────────────────────────────────────────────
export async function listInvoices(opts?: { propertyId?: string; ownerId?: string; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(invoices.propertyId, opts.propertyId));
  if (opts?.ownerId) conditions.push(eq(invoices.ownerId, opts.ownerId));
  if (opts?.status) conditions.push(eq(invoices.status, opts.status as any));
  const query = db.select().from(invoices);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(invoices.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function createInvoice(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(invoices).values({ ...data, id });
  return id;
}

export async function updateInvoice(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

// ─── Payments ───────────────────────────────────────────────────────
export async function listPayments(opts?: { invoiceId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.invoiceId) conditions.push(eq(payments.invoiceId, opts.invoiceId));
  const query = db.select().from(payments);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(payments.createdAt)).limit(opts?.limit ?? 50);
}

export async function createPayment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(payments).values({ ...data, id });
  return id;
}

// ─── Notifications ──────────────────────────────────────────────────
export async function listNotifications(opts: { recipientId: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.recipientId, opts.recipientId)).orderBy(desc(notifications.createdAt)).limit(opts.limit ?? 30);
}

export async function createNotification(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(notifications).values({ ...data, id });
  return id;
}

export async function markNotificationRead(id: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notifications).set({ readAt: new Date(), status: "read" }).where(eq(notifications.id, id));
}

// ─── Daily Ops ──────────────────────────────────────────────────────
export async function listDailyChecklists(opts?: { propertyId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(dailyChecklists.propertyId, opts.propertyId));
  const query = db.select().from(dailyChecklists);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(dailyChecklists.createdAt)).limit(opts?.limit ?? 30);
}

export async function createDailyChecklist(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(dailyChecklists).values({ ...data, id });
  return id;
}

export async function listBreakages(opts?: { propertyId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(breakages.propertyId, opts.propertyId));
  const query = db.select().from(breakages);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(breakages.createdAt)).limit(opts?.limit ?? 50);
}

// ─── Training ───────────────────────────────────────────────────────
export async function listTrainingModules(opts?: { limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trainingModules).where(eq(trainingModules.active, true)).limit(opts?.limit ?? 50);
}

export async function listTrainingCompletions(opts?: { personId?: string; moduleId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(trainingCompletions.personId, opts.personId));
  if (opts?.moduleId) conditions.push(eq(trainingCompletions.moduleId, opts.moduleId));
  const query = db.select().from(trainingCompletions);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(trainingCompletions.createdAt)).limit(opts?.limit ?? 50);
}

// ─── Exits ──────────────────────────────────────────────────────────
export async function listExits(opts?: { status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.status) conditions.push(eq(exits.status, opts.status as any));
  const query = db.select().from(exits);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(exits.createdAt)).limit(opts?.limit ?? 50);
}

// ─── Referrals ──────────────────────────────────────────────────────
export async function listReferrals(opts?: { referrerPersonId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.referrerPersonId) conditions.push(eq(referrals.referrerPersonId, opts.referrerPersonId));
  const query = db.select().from(referrals);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(referrals.createdAt)).limit(opts?.limit ?? 50);
}

// ─── Requests (Owner Portal) ────────────────────────────────────────
export async function listRequests(opts?: { propertyId?: string; ownerId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(requests.propertyId, opts.propertyId));
  if (opts?.ownerId) conditions.push(eq(requests.ownerId, opts.ownerId));
  if (opts?.status) conditions.push(eq(requests.status, opts.status as any));
  const query = db.select().from(requests);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(requests.createdAt)).limit(opts?.limit ?? 50);
}

export async function createRequest(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(requests).values({ ...data, id });
  return id;
}

// ─── Dashboard Stats ────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { people: { total: 0, active: 0 }, properties: { total: 0, live: 0 }, expenses: { pending: 0 }, leaves: { pending: 0 } };

  const [peopleStats, propStats] = await Promise.all([
    getPeopleStats(),
    getPropertyStats(),
  ]);

  const pendingExpenses = await db.select({ cnt: count() }).from(expenses).where(eq(expenses.approvalStatus, "pending"));
  const pendingLeaves = await db.select({ cnt: count() }).from(leaveApplications).where(eq(leaveApplications.status, "pending"));

  return {
    people: peopleStats,
    properties: propStats,
    expenses: { pending: Number(pendingExpenses[0]?.cnt ?? 0) },
    leaves: { pending: Number(pendingLeaves[0]?.cnt ?? 0) },
  };
}

// ─── Exits (CRUD) ──────────────────────────────────────────────────
export async function createExit(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(exits).values({ ...data, id });
  return id;
}

export async function updateExit(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(exits).set(data).where(eq(exits.id, id));
}

// ─── Referrals (CRUD) ──────────────────────────────────────────────
export async function createReferral(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(referrals).values({ ...data, id });
  return id;
}

export async function updateReferral(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(referrals).set(data).where(eq(referrals.id, id));
}

// ─── ID Cards (CRUD) ──────────────────────────────────────────────
export async function listIdCards(opts?: { personId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(idCards.personId, opts.personId));
  if (opts?.status) conditions.push(eq(idCards.status, opts.status as any));
  const query = db.select().from(idCards);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(idCards.createdAt)).limit(opts?.limit ?? 50);
}

export async function createIdCard(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(idCards).values({ ...data, id });
  return id;
}

export async function updateIdCard(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(idCards).set(data).where(eq(idCards.id, id));
}

// ─── Contracts (CRUD) ──────────────────────────────────────────────
export async function listContracts(opts?: { personId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(contracts.personId, opts.personId));
  if (opts?.status) conditions.push(eq(contracts.status, opts.status as any));
  const query = db.select().from(contracts);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(contracts.createdAt)).limit(opts?.limit ?? 50);
}

export async function getContractById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createContract(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(contracts).values({ ...data, id });
  return id;
}

export async function updateContract(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contracts).set(data).where(eq(contracts.id, id));
}

// ─── Contract Templates ────────────────────────────────────────────
export async function listContractTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contractTemplates).where(eq(contractTemplates.active, true));
}

export async function createContractTemplate(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(contractTemplates).values({ ...data, id });
  return id;
}

// ─── Performance Reviews (CRUD) ────────────────────────────────────
export async function listPerformanceReviews(opts?: { personId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(performanceReviews.personId, opts.personId));
  const query = db.select().from(performanceReviews);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(performanceReviews.createdAt)).limit(opts?.limit ?? 50);
}

export async function createPerformanceReview(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(performanceReviews).values({ ...data, id });
  return id;
}

// ─── Feedback (CRUD) ───────────────────────────────────────────────
export async function listFeedback(opts?: { personId?: string; type?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(feedback.personId, opts.personId));
  if (opts?.type) conditions.push(eq(feedback.type, opts.type as any));
  const query = db.select().from(feedback);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(feedback.createdAt)).limit(opts?.limit ?? 50);
}

export async function createFeedback(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(feedback).values({ ...data, id });
  return id;
}

// ─── Onboarding Checklists (CRUD) ──────────────────────────────────
export async function listOnboardingChecklists(opts?: { personId?: string; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(onboardingChecklists.personId, opts.personId));
  if (opts?.status) conditions.push(eq(onboardingChecklists.status, opts.status as any));
  const query = db.select().from(onboardingChecklists);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(onboardingChecklists.createdAt)).limit(opts?.limit ?? 50);
}

export async function createOnboardingChecklist(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(onboardingChecklists).values({ ...data, id });
  return id;
}

export async function updateOnboardingChecklist(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(onboardingChecklists).set(data).where(eq(onboardingChecklists.id, id));
}

// ─── Breakages (CRUD) ──────────────────────────────────────────────
export async function createBreakage(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(breakages).values({ ...data, id });
  return id;
}

export async function updateBreakage(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(breakages).set(data).where(eq(breakages.id, id));
}

// ─── Training Module CRUD ──────────────────────────────────────────
export async function createTrainingModule(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(trainingModules).values({ ...data, id });
  return id;
}

export async function createTrainingCompletion(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(trainingCompletions).values({ ...data, id });
  return id;
}

// ─── Monthly Reports ───────────────────────────────────────────────
export async function listMonthlyReports(opts?: { propertyId?: string; ownerId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.propertyId) conditions.push(eq(monthlyReports.propertyId, opts.propertyId));
  // monthlyReports has no ownerId column — filter by propertyId only
  const query = db.select().from(monthlyReports);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(monthlyReports.createdAt)).limit(opts?.limit ?? 24);
}

// ─── Leave Policies (CRUD) ─────────────────────────────────────────
export async function createLeavePolicy(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(leavePolicies).values({ ...data, id });
  return id;
}

export async function updateLeavePolicy(id: string, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leavePolicies).set(data).where(eq(leavePolicies.id, id));
}

// ─── Fee Structures ────────────────────────────────────────────────
export async function listFeeStructures(_propertyId?: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feeStructures);
}

export async function createFeeStructure(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(feeStructures).values({ ...data, id });
  return id;
}

// ─── SLAs ──────────────────────────────────────────────────────────
export async function listSlas(_propertyId?: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slas);
}

export async function createSla(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const id = data.id ?? newId();
  await db.insert(slas).values({ ...data, id });
  return id;
}

// ─── Anomaly Detection ────────────────────────────────────────────
export async function getAnomalyData() {
  const db = await getDb();
  if (!db) return {
    attendanceAnomalies: { noCheckIn3Days: 0, lateCheckIns: 0, missedCheckOuts: 0 },
    financialAnomalies: { overdueInvoices: 0, unusualExpenses: 0, pendingReconciliation: 0 },
    operationalAnomalies: { coverageGaps: 0, overdueChecklists: 0, lowInventory: 0 },
  };

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Attendance: people with no check-in in 3+ days (active staff)
  const activePeople = await db.select({ id: people.id }).from(people)
    .where(eq(people.employmentStatus, "active"));
  const recentAttendance = await db.select({ personId: shiftEvents.personId })
    .from(shiftEvents)
    .where(gte(shiftEvents.occurredAt, threeDaysAgo));
  const recentPersonIds = new Set(recentAttendance.map(a => a.personId));
  const noCheckIn3Days = activePeople.filter(p => !recentPersonIds.has(p.id)).length;

  // Attendance: missed check-outs (check_in without check_out in last 7 days)
  const recentCheckIns = await db.select({ shiftSessionId: shiftEvents.shiftSessionId, eventType: shiftEvents.eventType })
    .from(shiftEvents)
    .where(and(gte(shiftEvents.occurredAt, sevenDaysAgo)));
  const sessionMap = new Map<string, Set<string>>();
  for (const e of recentCheckIns) {
    if (!e.shiftSessionId) continue;
    if (!sessionMap.has(e.shiftSessionId)) sessionMap.set(e.shiftSessionId, new Set());
    sessionMap.get(e.shiftSessionId)!.add(e.eventType);
  }
  let missedCheckOuts = 0;
  Array.from(sessionMap.values()).forEach(events => {
    if (events.has("check_in") && !events.has("check_out")) missedCheckOuts++;
  });

  // Financial: overdue invoices
  const overdueInvoices = await db.select({ id: invoices.id }).from(invoices)
    .where(eq(invoices.status, "overdue"));

  // Financial: pending reconciliation (expenses in captured status)
  const pendingExpenses = await db.select({ id: expenses.id }).from(expenses)
    .where(eq(expenses.status, "captured"));

  // Operational: overdue checklists (pending status older than today)
  const overdueChecklists = await db.select({ id: dailyChecklists.id }).from(dailyChecklists)
    .where(eq(dailyChecklists.status, "pending"));

  // Operational: low inventory (quantity <= 2)
  const lowInventory = await db.select({ id: inventoryItems.id }).from(inventoryItems)
    .where(lte(inventoryItems.quantity, 2));

  // Operational: coverage gaps — properties with no active assignment
  const allProperties = await db.select({ id: properties.id }).from(properties)
    .where(eq(properties.status, "live"));
  const activeAssignments = await db.select({ propertyId: assignments.propertyId }).from(assignments)
    .where(eq(assignments.status, "active"));
  const assignedPropertyIds = new Set(activeAssignments.map(a => a.propertyId));
  const coverageGaps = allProperties.filter(p => !assignedPropertyIds.has(p.id)).length;

  // Financial: unusual expenses — expenses above 2x average in last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentExpenses = await db.select({ amount: expenses.amount }).from(expenses)
    .where(gte(expenses.createdAt, thirtyDaysAgo));
  let unusualExpenses = 0;
  if (recentExpenses.length > 2) {
    const amounts = recentExpenses.map(e => parseFloat(String(e.amount ?? "0")));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    unusualExpenses = amounts.filter(a => a > avg * 2).length;
  }

  return {
    attendanceAnomalies: {
      noCheckIn3Days,
      lateCheckIns: 0, // requires shift schedule comparison — not yet modeled
      missedCheckOuts,
    },
    financialAnomalies: {
      overdueInvoices: overdueInvoices.length,
      unusualExpenses,
      pendingReconciliation: pendingExpenses.length,
    },
    operationalAnomalies: {
      coverageGaps,
      overdueChecklists: overdueChecklists.length,
      lowInventory: lowInventory.length,
    },
  };
}
