import { eq, desc, and, gte, lte, sql, like, or, inArray, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, people, properties, owners, propertyOwners,
  assignments, shiftEvents, leaveApplications, leaveBalances, leavePolicies,
  payrollRuns, payrollLines, payrollDeductions, salaryHolds,
  requisitions, candidates, onboardingChecklists, contracts, contractTemplates,
  trainingModules, trainingCompletions, feedback, performanceReviews,
  exits, idCards, referrals, dailyChecklists, breakages,
  expenses, vendors, workOrders, inventoryItems, bookings,
  invoices, payments, requests, monthlyReports,
  notifications, auditLog, feeStructures, slas,
  shiftEventEdits,
  type InsertPerson, type Person,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Audit Log ──────────────────────────────────────────────────────
export async function writeAuditLog(entry: {
  actorId?: number | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
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

export async function getAuditLogs(opts: { entityType?: string; entityId?: number; limit?: number; offset?: number }) {
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

export async function getPersonById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return result[0];
}

export async function createPerson(data: InsertPerson) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(people).values(data);
  return result[0].insertId;
}

export async function updatePerson(id: number, data: Partial<InsertPerson>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(people).set(data).where(eq(people.id, id));
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

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result[0];
}

export async function createProperty(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(properties).values(data);
  return result[0].insertId;
}

export async function updateProperty(id: number, data: any) {
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
  const result = await db.insert(owners).values(data);
  return result[0].insertId;
}

// ─── Assignments ────────────────────────────────────────────────────
export async function listAssignments(opts?: { propertyId?: number; personId?: number; status?: string; limit?: number }) {
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
  const result = await db.insert(assignments).values(data);
  return result[0].insertId;
}

// ─── Attendance ─────────────────────────────────────────────────────
export async function listShiftEvents(opts?: { personId?: number; propertyId?: number; from?: Date; to?: Date; limit?: number }) {
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
  const result = await db.insert(shiftEvents).values(data);
  return result[0].insertId;
}

// ─── Leave ──────────────────────────────────────────────────────────
export async function listLeaveApplications(opts?: { personId?: number; status?: string; limit?: number; offset?: number }) {
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
  const result = await db.insert(leaveApplications).values(data);
  return result[0].insertId;
}

export async function updateLeaveApplication(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leaveApplications).set(data).where(eq(leaveApplications.id, id));
}

export async function listLeavePolicies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leavePolicies).where(eq(leavePolicies.active, true));
}

export async function getLeaveBalances(personId: number) {
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

export async function getPayrollLines(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payrollLines).where(eq(payrollLines.payrollRunId, runId));
}

export async function createPayrollRun(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(payrollRuns).values(data);
  return result[0].insertId;
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
  const result = await db.insert(requisitions).values(data);
  return result[0].insertId;
}

export async function listCandidates(opts?: { requisitionId?: number; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.requisitionId) conditions.push(eq(candidates.requisitionId, opts.requisitionId));
  if (opts?.status) conditions.push(eq(candidates.status, opts.status as any));
  const query = db.select().from(candidates);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(candidates.createdAt)).limit(opts?.limit ?? 50);
}

export async function createCandidate(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(candidates).values(data);
  return result[0].insertId;
}

export async function updateCandidate(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(candidates).set(data).where(eq(candidates.id, id));
}

// ─── Expenses ───────────────────────────────────────────────────────
export async function listExpenses(opts?: { propertyId?: number; status?: string; limit?: number; offset?: number }) {
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
  const result = await db.insert(expenses).values(data);
  return result[0].insertId;
}

export async function updateExpense(id: number, data: any) {
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
  const result = await db.insert(vendors).values(data);
  return result[0].insertId;
}

export async function listWorkOrders(opts?: { propertyId?: number; vendorId?: number; status?: string; limit?: number }) {
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
  const result = await db.insert(workOrders).values(data);
  return result[0].insertId;
}

// ─── Inventory ──────────────────────────────────────────────────────
export async function listInventoryItems(opts?: { propertyId?: number; limit?: number }) {
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
  const result = await db.insert(inventoryItems).values(data);
  return result[0].insertId;
}

// ─── Bookings ───────────────────────────────────────────────────────
export async function listBookings(opts?: { propertyId?: number; status?: string; limit?: number }) {
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
  const result = await db.insert(bookings).values(data);
  return result[0].insertId;
}

// ─── Invoices ───────────────────────────────────────────────────────
export async function listInvoices(opts?: { propertyId?: number; ownerId?: number; status?: string; limit?: number; offset?: number }) {
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
  const result = await db.insert(invoices).values(data);
  return result[0].insertId;
}

export async function updateInvoice(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

// ─── Payments ───────────────────────────────────────────────────────
export async function listPayments(opts?: { invoiceId?: number; limit?: number }) {
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
  const result = await db.insert(payments).values(data);
  return result[0].insertId;
}

// ─── Notifications ──────────────────────────────────────────────────
export async function listNotifications(opts: { recipientId: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.recipientId, opts.recipientId)).orderBy(desc(notifications.createdAt)).limit(opts.limit ?? 30);
}

export async function createNotification(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notifications).set({ readAt: new Date(), status: "read" }).where(eq(notifications.id, id));
}

// ─── Daily Ops ──────────────────────────────────────────────────────
export async function listDailyChecklists(opts?: { propertyId?: number; limit?: number }) {
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
  const result = await db.insert(dailyChecklists).values(data);
  return result[0].insertId;
}

export async function listBreakages(opts?: { propertyId?: number; limit?: number }) {
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

export async function listTrainingCompletions(opts?: { personId?: number; moduleId?: number; limit?: number }) {
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
export async function listReferrals(opts?: { referrerPersonId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.referrerPersonId) conditions.push(eq(referrals.referrerPersonId, opts.referrerPersonId));
  const query = db.select().from(referrals);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(referrals.createdAt)).limit(opts?.limit ?? 50);
}

// ─── Requests (Owner Portal) ────────────────────────────────────────
export async function listRequests(opts?: { propertyId?: number; ownerId?: number; status?: string; limit?: number }) {
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
  const result = await db.insert(requests).values(data);
  return result[0].insertId;
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
  const result = await db.insert(exits).values(data);
  return result[0].insertId;
}

export async function updateExit(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(exits).set(data).where(eq(exits.id, id));
}

// ─── Referrals (CRUD) ──────────────────────────────────────────────
export async function createReferral(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(referrals).values(data);
  return result[0].insertId;
}

export async function updateReferral(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(referrals).set(data).where(eq(referrals.id, id));
}

// ─── ID Cards (CRUD) ──────────────────────────────────────────────
export async function listIdCards(opts?: { personId?: number; status?: string; limit?: number }) {
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
  const result = await db.insert(idCards).values(data);
  return result[0].insertId;
}

export async function updateIdCard(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(idCards).set(data).where(eq(idCards.id, id));
}

// ─── Contracts (CRUD) ──────────────────────────────────────────────
export async function listContracts(opts?: { personId?: number; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.personId) conditions.push(eq(contracts.personId, opts.personId));
  if (opts?.status) conditions.push(eq(contracts.status, opts.status as any));
  const query = db.select().from(contracts);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(desc(contracts.createdAt)).limit(opts?.limit ?? 50);
}

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createContract(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contracts).values(data);
  return result[0].insertId;
}

export async function updateContract(id: number, data: any) {
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
  const result = await db.insert(contractTemplates).values(data);
  return result[0].insertId;
}

// ─── Performance Reviews (CRUD) ────────────────────────────────────
export async function listPerformanceReviews(opts?: { personId?: number; limit?: number }) {
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
  const result = await db.insert(performanceReviews).values(data);
  return result[0].insertId;
}

// ─── Feedback (CRUD) ───────────────────────────────────────────────
export async function listFeedback(opts?: { personId?: number; type?: string; limit?: number }) {
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
  const result = await db.insert(feedback).values(data);
  return result[0].insertId;
}

// ─── Onboarding Checklists (CRUD) ──────────────────────────────────
export async function listOnboardingChecklists(opts?: { personId?: number; status?: string; limit?: number }) {
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
  const result = await db.insert(onboardingChecklists).values(data);
  return result[0].insertId;
}

export async function updateOnboardingChecklist(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(onboardingChecklists).set(data).where(eq(onboardingChecklists.id, id));
}

// ─── Breakages (CRUD) ──────────────────────────────────────────────
export async function createBreakage(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(breakages).values(data);
  return result[0].insertId;
}

export async function updateBreakage(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(breakages).set(data).where(eq(breakages.id, id));
}

// ─── Training Module CRUD ──────────────────────────────────────────
export async function createTrainingModule(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainingModules).values(data);
  return result[0].insertId;
}

export async function createTrainingCompletion(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainingCompletions).values(data);
  return result[0].insertId;
}

// ─── Monthly Reports ───────────────────────────────────────────────
export async function listMonthlyReports(opts?: { propertyId?: number; ownerId?: number; limit?: number }) {
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
  const result = await db.insert(leavePolicies).values(data);
  return result[0].insertId;
}

export async function updateLeavePolicy(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leavePolicies).set(data).where(eq(leavePolicies.id, id));
}

// ─── Fee Structures ────────────────────────────────────────────────
export async function listFeeStructures(_propertyId?: number) {
  const db = await getDb();
  if (!db) return [];
  // feeStructures is a global table — not per-property
  return db.select().from(feeStructures);
}

export async function createFeeStructure(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(feeStructures).values(data);
  return result[0].insertId;
}

// ─── SLAs ──────────────────────────────────────────────────────────
export async function listSlas(_propertyId?: number) {
  const db = await getDb();
  if (!db) return [];
  // slas is a global table — not per-property
  return db.select().from(slas);
}

export async function createSla(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(slas).values(data);
  return result[0].insertId;
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
