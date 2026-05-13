import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users (Auth) ───────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", [
    "super_admin", "central_admin", "ops_lead", "supply_lead",
    "finance_admin", "property_manager", "supervisor", "associate",
    "owner_portal", "user", "admin"
  ]).default("user").notNull(),
  phone: varchar("phone", { length: 20 }),
  permissionOverrides: json("permissionOverrides"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Module 1: Associates & Staff Master ────────────────────────────
export const people = mysqlTable("people", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  photoUrl: varchar("photoUrl", { length: 512 }),
  dob: date("dob"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  languagesSpoken: json("languagesSpoken"),
  primaryPhone: varchar("primaryPhone", { length: 20 }).notNull(),
  alternatePhone: varchar("alternatePhone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  currentAddress: text("currentAddress"),
  permanentAddress: text("permanentAddress"),
  emergencyContact: json("emergencyContact"),
  aadhaarMasked: varchar("aadhaarMasked", { length: 12 }),
  pan: varchar("pan", { length: 10 }),
  bankAccount: varchar("bankAccount", { length: 30 }),
  bankIfsc: varchar("bankIfsc", { length: 11 }),
  bankName: varchar("bankName", { length: 150 }),
  staffType: mysqlEnum("staffType", ["associate", "full_time", "trainee", "stipend"]).notNull(),
  employmentStatus: mysqlEnum("employmentStatus", ["active", "on_leave", "exited", "absconding"]).default("active").notNull(),
  designation: varchar("designation", { length: 150 }),
  joiningDate: date("joiningDate"),
  homePropertyId: int("homePropertyId"),
  currentSupervisorId: int("currentSupervisorId"),
  source: mysqlEnum("source", ["referral", "direct", "agency", "walk_in", "social_media"]),
  referrerId: int("referrerId"),
  agencyName: varchar("agencyName", { length: 255 }),
  deployable: boolean("deployable").default(false),
  documentsVerified: boolean("documentsVerified").default(false),
  currentSalary: decimal("currentSalary", { precision: 12, scale: 2 }),
  salaryStructure: json("salaryStructure"),
  dailyRate: decimal("dailyRate", { precision: 10, scale: 2 }),
  documents: json("documents"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_people_status").on(table.employmentStatus),
  index("idx_people_type").on(table.staffType),
  index("idx_people_property").on(table.homePropertyId),
]);

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

// ─── Module 2: Hiring & ATS ────────────────────────────────────────
export const requisitions = mysqlTable("requisitions", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId"),
  roleCode: mysqlEnum("roleCode", [
    "housekeeping", "kitchen", "f_and_b", "maintenance",
    "security", "supervisor", "manager", "other"
  ]).notNull(),
  headcount: int("headcount").default(1).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  raisedBy: int("raisedBy"),
  targetCloseDate: date("targetCloseDate"),
  interviewOwnerRole: varchar("interviewOwnerRole", { length: 50 }),
  status: mysqlEnum("status", ["open", "in_progress", "filled", "cancelled"]).default("open").notNull(),
  filledByPersonId: int("filledByPersonId"),
  filledAt: timestamp("filledAt"),
  fillNotes: text("fillNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  requisitionId: int("requisitionId").references(() => requisitions.id),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  resumeUrl: varchar("resumeUrl", { length: 512 }),
  source: mysqlEnum("source", ["referral", "direct", "agency", "walk_in", "social_media"]),
  referralId: int("referralId"),
  agencyName: varchar("agencyName", { length: 255 }),
  expectedSalary: decimal("expectedSalary", { precision: 12, scale: 2 }),
  availabilityDate: date("availabilityDate"),
  interviewNotes: text("interviewNotes"),
  status: mysqlEnum("status", [
    "new", "screening", "interview", "offer_extended",
    "offer_accepted", "offer_declined", "rejected", "dropped", "hired"
  ]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Module 3: Onboarding ───────────────────────────────────────────
export const onboardingChecklists = mysqlTable("onboarding_checklists", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  items: json("items"),
  status: mysqlEnum("status", ["in_progress", "complete", "blocked"]).default("in_progress").notNull(),
  blockerReason: text("blockerReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Module 4: Contracts & Documents ────────────────────────────────
export const contractTemplates = mysqlTable("contract_templates", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  version: int("version").default(1).notNull(),
  appliesToStaffType: varchar("appliesToStaffType", { length: 50 }),
  entity: varchar("entity", { length: 255 }),
  templateHtml: text("templateHtml"),
  mergeFields: json("mergeFields"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  templateId: int("templateId").references(() => contractTemplates.id),
  templateCode: varchar("templateCode", { length: 50 }),
  mergeValues: json("mergeValues"),
  generatedPdfUrl: varchar("generatedPdfUrl", { length: 512 }),
  signedPdfUrl: varchar("signedPdfUrl", { length: 512 }),
  status: mysqlEnum("status", [
    "draft", "sent", "signed", "active", "expired", "superseded", "cancelled"
  ]).default("draft").notNull(),
  issuedAt: timestamp("issuedAt"),
  signedAt: timestamp("signedAt"),
  effectiveFrom: date("effectiveFrom"),
  effectiveTo: date("effectiveTo"),
  supersedesId: int("supersedesId"),
  signatureProvider: varchar("signatureProvider", { length: 50 }),
  signatureRequestId: varchar("signatureRequestId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Module 5: Attendance ───────────────────────────────────────────
export const shiftEvents = mysqlTable("shift_events", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  propertyId: int("propertyId"),
  eventType: mysqlEnum("eventType", ["check_in", "break_start", "break_end", "check_out"]).notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  markMode: mysqlEnum("markMode", ["verified_self", "supervisor_marked", "imported", "retro_edit"]).notNull(),
  markedBy: int("markedBy").notNull(),
  gpsLat: decimal("gpsLat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gpsLng", { precision: 11, scale: 7 }),
  withinGeofence: boolean("withinGeofence"),
  geofenceDistanceM: int("geofenceDistanceM"),
  selfieUrl: varchar("selfieUrl", { length: 512 }),
  deviceId: varchar("deviceId", { length: 128 }),
  shiftSessionId: varchar("shiftSessionId", { length: 36 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_shift_person_date").on(table.personId, table.occurredAt),
  index("idx_shift_property_date").on(table.propertyId, table.occurredAt),
  index("idx_shift_session").on(table.shiftSessionId),
]);

export const shiftEventEdits = mysqlTable("shift_event_edits", {
  id: int("id").autoincrement().primaryKey(),
  shiftEventId: int("shiftEventId").references(() => shiftEvents.id).notNull(),
  editedBy: int("editedBy").notNull(),
  editedAt: timestamp("editedAt").defaultNow().notNull(),
  beforeValue: json("beforeValue"),
  afterValue: json("afterValue"),
  reasonCode: varchar("reasonCode", { length: 32 }).notNull(),
  reasonNote: text("reasonNote"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  approvalStatus: mysqlEnum("approvalStatus", ["not_required", "pending", "approved", "rejected"]).default("not_required").notNull(),
});

// ─── Module 6: Leave Management ─────────────────────────────────────
export const leavePolicies = mysqlTable("leave_policies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  appliesToStaffType: varchar("appliesToStaffType", { length: 50 }),
  appliesToRoleId: int("appliesToRoleId"),
  leaveType: mysqlEnum("leaveType", [
    "casual", "sick", "earned", "unpaid", "comp_off", "maternity", "paternity"
  ]).notNull(),
  accrualRate: decimal("accrualRate", { precision: 5, scale: 2 }),
  maxBalance: decimal("maxBalance", { precision: 5, scale: 1 }),
  carryForwardPct: decimal("carryForwardPct", { precision: 5, scale: 2 }).default("0"),
  encashmentAllowed: boolean("encashmentAllowed").default(false),
  probationBlockDays: int("probationBlockDays").default(0),
  prorateOnJoin: boolean("prorateOnJoin").default(true),
  minNoticeDays: int("minNoticeDays").default(0),
  maxConsecutiveDays: int("maxConsecutiveDays"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const leaveBalances = mysqlTable("leave_balances", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  policyId: int("policyId").references(() => leavePolicies.id).notNull(),
  balance: decimal("balance", { precision: 5, scale: 1 }).default("0").notNull(),
  earnedToDate: decimal("earnedToDate", { precision: 5, scale: 1 }).default("0").notNull(),
  usedToDate: decimal("usedToDate", { precision: 5, scale: 1 }).default("0").notNull(),
  lastAccrualAt: timestamp("lastAccrualAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const leaveApplications = mysqlTable("leave_applications", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  policyId: int("policyId").references(() => leavePolicies.id).notNull(),
  leaveType: varchar("leaveType", { length: 50 }).notNull(),
  fromDate: date("fromDate").notNull(),
  toDate: date("toDate").notNull(),
  days: decimal("days", { precision: 4, scale: 1 }).notNull(),
  halfDayStart: boolean("halfDayStart").default(false),
  halfDayEnd: boolean("halfDayEnd").default(false),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 7: Payroll ──────────────────────────────────────────────
export const payrollRuns = mysqlTable("payroll_runs", {
  id: int("id").autoincrement().primaryKey(),
  cycleMonth: varchar("cycleMonth", { length: 7 }).notNull(),
  entity: varchar("entity", { length: 255 }),
  staffTypes: json("staffTypes"),
  cutoffDate: date("cutoffDate"),
  status: mysqlEnum("status", ["draft", "locked", "finalized", "reverted"]).default("draft").notNull(),
  initiatedBy: int("initiatedBy"),
  initiatedAt: timestamp("initiatedAt").defaultNow(),
  finalizedAt: timestamp("finalizedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payrollLines = mysqlTable("payroll_lines", {
  id: int("id").autoincrement().primaryKey(),
  payrollRunId: int("payrollRunId").references(() => payrollRuns.id).notNull(),
  personId: int("personId").references(() => people.id).notNull(),
  workingDays: decimal("workingDays", { precision: 5, scale: 1 }),
  leaveDays: decimal("leaveDays", { precision: 5, scale: 1 }),
  absentDays: decimal("absentDays", { precision: 5, scale: 1 }),
  netWorkMinutes: int("netWorkMinutes"),
  grossPay: decimal("grossPay", { precision: 12, scale: 2 }),
  deductionsTotal: decimal("deductionsTotal", { precision: 12, scale: 2 }),
  netPay: decimal("netPay", { precision: 12, scale: 2 }),
  holdApplied: boolean("holdApplied").default(false),
  payslipPdfUrl: varchar("payslipPdfUrl", { length: 512 }),
  status: mysqlEnum("status", ["pending", "calculated", "approved", "paid"]).default("pending").notNull(),
  calculationInputs: json("calculationInputs"),
  calculatedAt: timestamp("calculatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payrollDeductions = mysqlTable("payroll_deductions", {
  id: int("id").autoincrement().primaryKey(),
  payrollLineId: int("payrollLineId").references(() => payrollLines.id).notNull(),
  personId: int("personId").references(() => people.id).notNull(),
  code: mysqlEnum("code", ["ADV", "ABS", "DMG", "DIS", "OPS", "TAX", "STAT", "OTHER"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reasonNote: text("reasonNote"),
  evidenceUrl: varchar("evidenceUrl", { length: 512 }),
  requestedBy: int("requestedBy"),
  requestedAt: timestamp("requestedAt"),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const salaryHolds = mysqlTable("salary_holds", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  payrollLineId: int("payrollLineId"),
  reason: varchar("reason", { length: 255 }).notNull(),
  reasonNote: text("reasonNote"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  appliedBy: int("appliedBy"),
  appliedAt: timestamp("appliedAt").defaultNow(),
  expiresAt: timestamp("expiresAt"),
  releasedBy: int("releasedBy"),
  releasedAt: timestamp("releasedAt"),
  releaseNote: text("releaseNote"),
  status: mysqlEnum("status", ["active", "released", "expired"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 8: Training & L&D ──────────────────────────────────────
export const trainingModules = mysqlTable("training_modules", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  roleCodes: json("roleCodes"),
  staffTypes: json("staffTypes"),
  completionType: mysqlEnum("completionType", ["read", "quiz", "video", "signoff"]).default("read").notNull(),
  contentUrl: varchar("contentUrl", { length: 512 }),
  mandatory: boolean("mandatory").default(false),
  active: boolean("active").default(true).notNull(),
  expiresAfterDays: int("expiresAfterDays"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const trainingCompletions = mysqlTable("training_completions", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  moduleId: int("moduleId").references(() => trainingModules.id).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  signedOffBy: int("signedOffBy"),
  score: int("score"),
  status: mysqlEnum("status", ["assigned", "in_progress", "completed", "expired"]).default("assigned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 9: Performance & Feedback ───────────────────────────────
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  propertyId: int("propertyId"),
  source: varchar("source", { length: 50 }),
  type: mysqlEnum("type", ["appreciation", "complaint", "observation"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]),
  description: text("description").notNull(),
  actionTaken: text("actionTaken"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  status: mysqlEnum("feedbackStatus", ["open", "reviewed", "resolved", "dismissed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const performanceReviews = mysqlTable("performance_reviews", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  reviewerId: int("reviewerId").notNull(),
  reviewPeriodStart: date("reviewPeriodStart").notNull(),
  reviewPeriodEnd: date("reviewPeriodEnd").notNull(),
  reviewData: json("reviewData"),
  outcome: mysqlEnum("outcome", ["increment", "promotion", "pip", "exit", "no_change"]),
  revieweeSignoffAt: timestamp("revieweeSignoffAt"),
  opsLeadSignoffAt: timestamp("opsLeadSignoffAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 10: Exit Management ─────────────────────────────────────
export const exits = mysqlTable("exits", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  exitType: mysqlEnum("exitType", [
    "resignation", "termination", "absconding", "contract_end", "mutual"
  ]).notNull(),
  initiatedAt: timestamp("initiatedAt").defaultNow(),
  initiatedBy: int("initiatedBy"),
  lastWorkingDay: date("lastWorkingDay"),
  checklist: json("checklist"),
  ffAmount: decimal("ffAmount", { precision: 12, scale: 2 }),
  ffProcessedAt: timestamp("ffProcessedAt"),
  reason: text("reason"),
  notes: text("notes"),
  status: mysqlEnum("exitStatus", ["initiated", "in_progress", "completed", "reversed"]).default("initiated").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 11: Identity (ID Cards) ────────────────────────────────
export const idCards = mysqlTable("id_cards", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  cardNumber: varchar("cardNumber", { length: 32 }).notNull().unique(),
  qrToken: varchar("qrToken", { length: 128 }).notNull().unique(),
  photoUrl: varchar("photoUrl", { length: 512 }),
  designation: varchar("designation", { length: 150 }),
  propertyId: int("propertyId"),
  validFrom: date("validFrom"),
  validUntil: date("validUntil"),
  generatedAt: timestamp("generatedAt").defaultNow(),
  generatedPdfUrl: varchar("generatedPdfUrl", { length: 512 }),
  status: mysqlEnum("idCardStatus", ["active", "expired", "revoked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 12: Referrals ───────────────────────────────────────────
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerPersonId: int("referrerPersonId").references(() => people.id).notNull(),
  candidateId: int("candidateId"),
  candidateName: varchar("candidateName", { length: 255 }).notNull(),
  candidatePhone: varchar("candidatePhone", { length: 20 }).notNull(),
  referredAt: timestamp("referredAt").defaultNow(),
  notes: text("notes"),
  status: mysqlEnum("referralStatus", ["pending", "converted", "rejected", "withdrawn"]).default("pending").notNull(),
  bountyAmount: decimal("bountyAmount", { precision: 10, scale: 2 }),
  tranche1PaidAt: timestamp("tranche1PaidAt"),
  tranche2PaidAt: timestamp("tranche2PaidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 13: Property Master ─────────────────────────────────────
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("propertyType", ["villa", "second_home", "hotel", "apartment"]).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  gpsLat: decimal("gpsLat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gpsLng", { precision: 11, scale: 7 }),
  geofenceRadiusM: int("geofenceRadiusM").default(100),
  geofenceLenient: boolean("geofenceLenient").default(false),
  bedroomCount: int("bedroomCount"),
  bathroomCount: int("bathroomCount"),
  sqFt: int("sqFt"),
  amenities: json("amenities"),
  roomMap: json("roomMap"),
  photos: json("photos"),
  primaryOwnerId: int("primaryOwnerId"),
  assignedPmId: int("assignedPmId"),
  feeStructureId: int("feeStructureId"),
  slaId: int("slaId"),
  onboardedAt: timestamp("onboardedAt"),
  churnedAt: timestamp("churnedAt"),
  churnReason: text("churnReason"),
  status: mysqlEnum("propertyStatus", ["onboarding", "live", "paused", "churned"]).default("onboarding").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const owners = mysqlTable("owners", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("ownerType", ["individual", "company", "family_trust"]).default("individual").notNull(),
  primaryContact: varchar("primaryContact", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  alternateContacts: json("alternateContacts"),
  billingAddress: text("billingAddress"),
  gstin: varchar("gstin", { length: 20 }),
  pan: varchar("pan", { length: 10 }),
  notificationPrefs: json("notificationPrefs"),
  notes: text("notes"),
  status: mysqlEnum("ownerStatus", ["active", "churned"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const propertyOwners = mysqlTable("property_owners", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  ownerId: int("ownerId").references(() => owners.id).notNull(),
  ownershipPct: decimal("ownershipPct", { precision: 5, scale: 2 }),
  isPrimary: boolean("isPrimary").default(false),
  permissions: json("permissions"),
});

export const feeStructures = mysqlTable("fee_structures", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  monthlyFee: decimal("monthlyFee", { precision: 12, scale: 2 }),
  expenseMarkupPct: decimal("expenseMarkupPct", { precision: 5, scale: 2 }),
  manpowerBillingMode: mysqlEnum("manpowerBillingMode", ["cost_plus", "fixed_per_role", "fixed_total"]),
  manpowerTerms: json("manpowerTerms"),
  otherCharges: json("otherCharges"),
  paymentTerms: varchar("paymentTerms", { length: 255 }),
  gstTreatment: mysqlEnum("gstTreatment", ["regular", "sez", "export"]).default("regular"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const slas = mysqlTable("slas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  responseTimeHours: int("responseTimeHours"),
  monthlyVisitCount: int("monthlyVisitCount"),
  reportingFrequency: mysqlEnum("reportingFrequency", ["weekly", "monthly"]).default("monthly"),
  photoCadencePerMonth: int("photoCadencePerMonth").default(50),
  issueResolutionTargets: json("issueResolutionTargets"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 14: Assignment Roster ───────────────────────────────────
export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  personId: int("personId").references(() => people.id).notNull(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  roleCode: varchar("roleCode", { length: 50 }).notNull(),
  shift: mysqlEnum("shift", ["morning", "evening", "full_day", "night", "24x7"]).default("full_day"),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  assignmentType: mysqlEnum("assignmentType", ["permanent", "temporary", "transfer"]).default("permanent").notNull(),
  reason: text("reason"),
  status: mysqlEnum("assignmentStatus", ["active", "ended", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_assignment_property").on(table.propertyId, table.status),
  index("idx_assignment_person").on(table.personId, table.status),
]);

// ─── Module 15: Daily Operations ────────────────────────────────────
export const dailyChecklists = mysqlTable("daily_checklists", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  checklistDate: date("checklistDate").notNull(),
  submittedBy: int("submittedBy"),
  submittedAt: timestamp("submittedAt"),
  sections: json("sections"),
  photos: json("photos"),
  status: mysqlEnum("checklistStatus", ["pending", "submitted", "reviewed", "flagged"]).default("pending").notNull(),
  flags: json("flags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const breakages = mysqlTable("breakages", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  inventoryItemId: int("inventoryItemId"),
  description: text("description").notNull(),
  attributedTo: int("attributedTo"),
  attributionStatus: mysqlEnum("attributionStatus", [
    "unattributed", "associate", "guest", "accidental", "wear"
  ]).default("unattributed").notNull(),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 2 }),
  photoUrls: json("photoUrls"),
  status: mysqlEnum("breakageStatus", [
    "logged", "under_review", "resolved", "written_off", "recovered"
  ]).default("logged").notNull(),
  recoveryAmount: decimal("recoveryAmount", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 16: Expense Management ──────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id),
  incurredAt: date("incurredAt").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }),
  vendorId: int("vendorId"),
  category: mysqlEnum("expenseCategory", [
    "utility", "food", "maintenance", "consumables", "vendor", "staff", "other"
  ]).notNull(),
  subCategory: varchar("subCategory", { length: 100 }),
  billable: boolean("billable").default(true),
  markupApplied: decimal("markupApplied", { precision: 10, scale: 2 }),
  description: text("description"),
  billUrl: varchar("billUrl", { length: 512 }),
  paymentMethod: mysqlEnum("paymentMethod", [
    "omni_card", "omni_upi", "cash_advance", "personal", "bank_transfer"
  ]),
  omniTxnId: varchar("omniTxnId", { length: 100 }),
  capturedBy: int("capturedBy"),
  capturedAt: timestamp("capturedAt").defaultNow(),
  approvalStatus: mysqlEnum("expenseApprovalStatus", [
    "pending", "approved", "rejected", "auto_approved"
  ]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  invoiceId: int("invoiceId"),
  status: mysqlEnum("expenseStatus", [
    "captured", "approved", "invoiced", "reimbursed", "rejected"
  ]).default("captured").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 17: Vendor Management ───────────────────────────────────
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  contactName: varchar("contactName", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  gstin: varchar("gstin", { length: 20 }),
  paymentTerms: varchar("paymentTerms", { length: 255 }),
  propertiesServed: json("propertiesServed"),
  avgRating: decimal("avgRating", { precision: 3, scale: 1 }),
  status: mysqlEnum("vendorStatus", ["active", "blacklisted", "inactive"]).default("active").notNull(),
  blacklistReason: text("blacklistReason"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workOrders = mysqlTable("work_orders", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  vendorId: int("vendorId").references(() => vendors.id).notNull(),
  raisedBy: int("raisedBy"),
  description: text("description").notNull(),
  quotedAmount: decimal("quotedAmount", { precision: 12, scale: 2 }),
  scheduledFor: date("scheduledFor"),
  completedAt: timestamp("completedAt"),
  finalAmount: decimal("finalAmount", { precision: 12, scale: 2 }),
  rating: int("rating"),
  expenseId: int("expenseId"),
  status: mysqlEnum("workOrderStatus", [
    "raised", "accepted", "in_progress", "completed", "cancelled", "disputed"
  ]).default("raised").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 18: Inventory & Assets ──────────────────────────────────
export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  location: varchar("location", { length: 255 }),
  quantity: int("quantity").default(1),
  unit: varchar("unit", { length: 50 }),
  condition: mysqlEnum("itemCondition", ["new", "good", "fair", "poor", "damaged"]).default("good"),
  purchasedAt: date("purchasedAt"),
  expectedLifeMonths: int("expectedLifeMonths"),
  lastAuditedAt: timestamp("lastAuditedAt"),
  photoUrls: json("photoUrls"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 19: Bookings & Occupancy ────────────────────────────────
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  dateIn: date("dateIn").notNull(),
  dateOut: date("dateOut").notNull(),
  guestCount: int("guestCount"),
  guestName: varchar("guestName", { length: 255 }),
  source: varchar("source", { length: 100 }),
  externalRef: varchar("externalRef", { length: 255 }),
  notes: text("notes"),
  status: mysqlEnum("bookingStatus", ["confirmed", "tentative", "cancelled", "completed"]).default("confirmed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 20: Invoicing & Payments ────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNo: varchar("invoiceNo", { length: 50 }).notNull().unique(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  ownerId: int("ownerId").references(() => owners.id).notNull(),
  invoiceDate: date("invoiceDate").notNull(),
  dueDate: date("dueDate").notNull(),
  monthCovered: varchar("monthCovered", { length: 7 }).notNull(),
  manpowerAmount: decimal("manpowerAmount", { precision: 12, scale: 2 }),
  expenseAmount: decimal("expenseAmount", { precision: 12, scale: 2 }),
  managementFee: decimal("managementFee", { precision: 12, scale: 2 }),
  otherCharges: decimal("otherCharges", { precision: 12, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  gstAmount: decimal("gstAmount", { precision: 12, scale: 2 }),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).default("0"),
  amountOutstanding: decimal("amountOutstanding", { precision: 12, scale: 2 }),
  lineItems: json("lineItems"),
  gstTreatment: json("gstTreatment"),
  eInvoiceIrn: varchar("eInvoiceIrn", { length: 255 }),
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  issuedAt: timestamp("issuedAt"),
  status: mysqlEnum("invoiceStatus", [
    "draft", "issued", "partially_paid", "paid", "overdue", "disputed", "cancelled"
  ]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").references(() => invoices.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paidAt"),
  method: mysqlEnum("paymentMethod", [
    "cashfree", "bank_transfer", "cheque", "upi_direct", "adjustment"
  ]),
  cashfreePaymentId: varchar("cashfreePaymentId", { length: 255 }),
  bankReference: varchar("bankReference", { length: 255 }),
  notes: text("notes"),
  status: mysqlEnum("paymentStatus", ["captured", "reconciled", "refunded", "disputed"]).default("captured").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Module 21: Owner Portal — Requests ─────────────────────────────
export const requests = mysqlTable("requests", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  ownerId: int("ownerId").references(() => owners.id).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("requestPriority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  assignedTo: int("assignedTo"),
  resolvedAt: timestamp("resolvedAt"),
  resolution: text("resolution"),
  status: mysqlEnum("requestStatus", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Monthly Reports ────────────────────────────────────────────────
export const monthlyReports = mysqlTable("monthly_reports", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  generatedAt: timestamp("generatedAt"),
  dataSnapshot: json("dataSnapshot"),
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  sharedAt: timestamp("sharedAt"),
  status: mysqlEnum("reportStatus", ["draft", "review", "shared"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Cross-cutting: Notifications ───────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  recipientType: mysqlEnum("recipientType", ["staff", "owner"]).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  channel: mysqlEnum("channel", ["in_app", "email", "whatsapp", "sms"]).default("in_app").notNull(),
  sentAt: timestamp("sentAt"),
  readAt: timestamp("readAt"),
  metadata: json("metadata"),
  status: mysqlEnum("notificationStatus", ["queued", "sent", "delivered", "failed", "read"]).default("queued").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Cross-cutting: Audit Log ───────────────────────────────────────
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId"),
  actorRole: varchar("actorRole", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  beforeValue: json("beforeValue"),
  afterValue: json("afterValue"),
  reasonCode: varchar("reasonCode", { length: 32 }),
  reasonNote: text("reasonNote"),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_actor").on(table.actorId),
  index("idx_audit_time").on(table.occurredAt),
]);
