import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { mergeTemplate, wrapContractHtml, buildMergeValues, storeContractDocument } from "./services/contractMerge";
import { calculateFnF, type FnFInput } from "./services/settlement";
import { uploadModuleFile, validateUpload, type MediaModule } from "./services/media";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      // Real cookie clearing is wired in Prompt 3 alongside JWT auth.
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard ──────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return db.getDashboardStats();
    }),
  }),

  // ─── People ─────────────────────────────────────────────────────
  people: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), staffType: z.string().optional(), search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => db.listPeople(input ?? {})),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getPersonById(input.id)),
    create: protectedProcedure
      .input(z.object({
        fullName: z.string().min(1),
        primaryPhone: z.string().min(1),
        staffType: z.enum(["associate", "full_time", "trainee", "stipend"]),
        email: z.string().optional(),
        designation: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        source: z.enum(["referral", "direct", "agency", "walk_in", "social_media"]).optional(),
        joiningDate: z.string().optional(),
        currentSalary: z.string().optional(),
        dailyRate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createPerson({
          ...input,
          joiningDate: input.joiningDate || undefined,
        } as any);
        await db.writeAuditLog({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "create",
          entityType: "person",
          entityId: id,
          afterValue: input,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ input, ctx }) => {
        const before = await db.getPersonById(input.id);
        await db.updatePerson(input.id, input.data as any);
        await db.writeAuditLog({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "update",
          entityType: "person",
          entityId: input.id,
          beforeValue: before,
          afterValue: input.data,
        });
        return { success: true };
      }),
    stats: protectedProcedure.query(async () => db.getPeopleStats()),
  }),

  // ─── Properties ─────────────────────────────────────────────────
  properties: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), search: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => db.listProperties(input ?? {})),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getPropertyById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["villa", "second_home", "hotel", "apartment"]),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        bedroomCount: z.number().optional(),
        bathroomCount: z.number().optional(),
        sqFt: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createProperty(input);
        await db.writeAuditLog({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "create",
          entityType: "property",
          entityId: id,
          afterValue: input,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ input, ctx }) => {
        const before = await db.getPropertyById(input.id);
        await db.updateProperty(input.id, input.data);
        await db.writeAuditLog({
          actorId: ctx.user.id,
          actorRole: ctx.user.role,
          action: "update",
          entityType: "property",
          entityId: input.id,
          beforeValue: before,
          afterValue: input.data,
        });
        return { success: true };
      }),
    stats: protectedProcedure.query(async () => db.getPropertyStats()),
  }),

  // ─── Owners ─────────────────────────────────────────────────────
  owners: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => db.listOwners(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["individual", "company", "family_trust"]).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        primaryContact: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createOwner(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "owner", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Assignments ────────────────────────────────────────────────
  assignments: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), personId: z.number().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => db.listAssignments(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        personId: z.number(),
        propertyId: z.number(),
        roleCode: z.string(),
        shift: z.enum(["morning", "evening", "full_day", "night", "24x7"]).optional(),
        startDate: z.string(),
        assignmentType: z.enum(["permanent", "temporary", "transfer"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createAssignment(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "assignment", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Attendance ─────────────────────────────────────────────────
  attendance: router({
    list: protectedProcedure
      .input(z.object({ personId: z.number().optional(), propertyId: z.number().optional(), from: z.date().optional(), to: z.date().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listShiftEvents(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        personId: z.number(),
        propertyId: z.number().optional(),
        eventType: z.enum(["check_in", "break_start", "break_end", "check_out"]),
        occurredAt: z.date(),
        markMode: z.enum(["verified_self", "supervisor_marked", "imported", "retro_edit"]),
        markedBy: z.number(),
        gpsLat: z.string().optional(),
        gpsLng: z.string().optional(),
        withinGeofence: z.boolean().optional(),
        shiftSessionId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createShiftEvent(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "shift_event", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Leave ──────────────────────────────────────────────────────
  leave: router({
    list: protectedProcedure
      .input(z.object({ personId: z.number().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => db.listLeaveApplications(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        personId: z.number(),
        policyId: z.number(),
        leaveType: z.string(),
        fromDate: z.string(),
        toDate: z.string(),
        days: z.string(),
        reason: z.string().optional(),
        halfDayStart: z.boolean().optional(),
        halfDayEnd: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createLeaveApplication(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "leave_application", entityId: id, afterValue: input });
        return { id };
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number(), reviewNote: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateLeaveApplication(input.id, { status: "approved", reviewedBy: ctx.user.id, reviewedAt: new Date(), reviewNote: input.reviewNote });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "approve", entityType: "leave_application", entityId: input.id, afterValue: { status: "approved" } });
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ id: z.number(), reviewNote: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateLeaveApplication(input.id, { status: "rejected", reviewedBy: ctx.user.id, reviewedAt: new Date(), reviewNote: input.reviewNote });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "reject", entityType: "leave_application", entityId: input.id, afterValue: { status: "rejected" } });
        return { success: true };
      }),
    policies: protectedProcedure.query(async () => db.listLeavePolicies()),
    balances: protectedProcedure
      .input(z.object({ personId: z.number() }))
      .query(async ({ input }) => db.getLeaveBalances(input.personId)),
  }),

  // ─── Payroll ────────────────────────────────────────────────────
  payroll: router({
    runs: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listPayrollRuns(input ?? {})),
    lines: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ input }) => db.getPayrollLines(input.runId)),
    createRun: protectedProcedure
      .input(z.object({
        cycleMonth: z.string(),
        entity: z.string().optional(),
        staffTypes: z.array(z.string()).optional(),
        cutoffDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createPayrollRun({ ...input, initiatedBy: ctx.user.id });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "payroll_run", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Hiring ─────────────────────────────────────────────────────
  hiring: router({
    requisitions: protectedProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listRequisitions(input ?? {})),
    createRequisition: protectedProcedure
      .input(z.object({
        propertyId: z.number().optional(),
        roleCode: z.enum(["housekeeping", "kitchen", "f_and_b", "maintenance", "security", "supervisor", "manager", "other"]),
        headcount: z.number().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        targetCloseDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createRequisition({ ...input, raisedBy: ctx.user.id });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "requisition", entityId: id, afterValue: input });
        return { id };
      }),
    candidates: protectedProcedure
      .input(z.object({ requisitionId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listCandidates(input ?? {})),
    createCandidate: protectedProcedure
      .input(z.object({
        requisitionId: z.number().optional(),
        fullName: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().optional(),
        source: z.enum(["referral", "direct", "agency", "walk_in", "social_media"]).optional(),
        expectedSalary: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createCandidate(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "candidate", entityId: id, afterValue: input });
        return { id };
      }),
    updateCandidate: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ input, ctx }) => {
        await db.updateCandidate(input.id, input.data);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "update", entityType: "candidate", entityId: input.id, afterValue: input.data });
        return { success: true };
      }),
  }),

  // ─── Expenses ───────────────────────────────────────────────────
  expenses: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => db.listExpenses(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number().optional(),
        incurredAt: z.string(),
        amount: z.string(),
        category: z.enum(["utility", "food", "maintenance", "consumables", "vendor", "staff", "other"]),
        description: z.string().optional(),
        billable: z.boolean().optional(),
        paymentMethod: z.enum(["omni_card", "omni_upi", "cash_advance", "personal", "bank_transfer"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createExpense({ ...input, capturedBy: ctx.user.id });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "expense", entityId: id, afterValue: input });
        return { id };
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateExpense(input.id, { approvalStatus: "approved", approvedBy: ctx.user.id, approvedAt: new Date(), status: "approved" });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "approve", entityType: "expense", entityId: input.id });
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateExpense(input.id, { approvalStatus: "rejected", status: "rejected", rejectionReason: input.reason });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "reject", entityType: "expense", entityId: input.id });
        return { success: true };
      }),
  }),

  // ─── Vendors ────────────────────────────────────────────────────
  vendors: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), search: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listVendors(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        contactName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        gstin: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createVendor(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "vendor", entityId: id, afterValue: input });
        return { id };
      }),
    workOrders: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), vendorId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listWorkOrders(input ?? {})),
    createWorkOrder: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        vendorId: z.number(),
        description: z.string(),
        quotedAmount: z.string().optional(),
        scheduledFor: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createWorkOrder({ ...input, raisedBy: ctx.user.id });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "work_order", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Inventory ──────────────────────────────────────────────────
  inventory: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listInventoryItems(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        name: z.string().min(1),
        category: z.string().optional(),
        location: z.string().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        condition: z.enum(["new", "good", "fair", "poor", "damaged"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createInventoryItem(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "inventory_item", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Bookings ───────────────────────────────────────────────────
  bookings: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listBookings(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        dateIn: z.string(),
        dateOut: z.string(),
        guestCount: z.number().optional(),
        guestName: z.string().optional(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createBooking(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "booking", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Invoices ───────────────────────────────────────────────────
  invoices: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), ownerId: z.number().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => db.listInvoices(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        invoiceNo: z.string(),
        propertyId: z.number(),
        ownerId: z.number(),
        invoiceDate: z.string(),
        dueDate: z.string(),
        monthCovered: z.string(),
        totalAmount: z.string(),
        managementFee: z.string().optional(),
        expenseAmount: z.string().optional(),
        manpowerAmount: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createInvoice(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "invoice", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Payments ───────────────────────────────────────────────────
  payments: router({
    list: protectedProcedure
      .input(z.object({ invoiceId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listPayments(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        invoiceId: z.number(),
        amount: z.string(),
        method: z.enum(["cashfree", "bank_transfer", "cheque", "upi_direct", "adjustment"]).optional(),
        bankReference: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createPayment({ ...input, paidAt: new Date() });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "payment", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Notifications ──────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => db.listNotifications({ recipientId: ctx.user.id, limit: input?.limit })),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),
  }),

  // ─── Daily Ops ──────────────────────────────────────────────────
  dailyOps: router({
    checklists: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listDailyChecklists(input ?? {})),
    createChecklist: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        checklistDate: z.string(),
        sections: z.unknown().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createDailyChecklist({ ...input, submittedBy: ctx.user.id, submittedAt: new Date() });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "daily_checklist", entityId: id, afterValue: input });
        return { id };
      }),
    breakages: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listBreakages(input ?? {})),
  }),

  // ─── Training ───────────────────────────────────────────────────
  training: router({
    modules: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listTrainingModules(input ?? {})),
    completions: protectedProcedure
      .input(z.object({ personId: z.number().optional(), moduleId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listTrainingCompletions(input ?? {})),
    createModule: protectedProcedure
      .input(z.object({ title: z.string().min(1), description: z.string().optional(), completionType: z.enum(["video", "quiz", "in_person", "document"]).optional(), passingScore: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createTrainingModule({ ...input, active: true });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "training_module", entityId: id, afterValue: input });
        return { id };
      }),
    recordCompletion: protectedProcedure
      .input(z.object({ personId: z.number(), moduleId: z.number(), score: z.number().optional(), passed: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createTrainingCompletion({ ...input, completedAt: new Date() });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "training_completion", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Exits ──────────────────────────────────────────────────────
  exits: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listExits(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        personId: z.number(),
        exitType: z.enum(["resignation", "termination", "absconding", "contract_end", "mutual"]),
        lastWorkingDay: z.string().optional(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createExit({ ...input, initiatedBy: ctx.user.id });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "exit", entityId: id, afterValue: input });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ input, ctx }) => {
        await db.updateExit(input.id, input.data);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "update", entityType: "exit", entityId: input.id, afterValue: input.data });
        return { success: true };
      }),
  }),

  // ─── Referrals ──────────────────────────────────────────────────
  referrals: router({
    list: protectedProcedure
      .input(z.object({ referrerPersonId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listReferrals(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        referrerPersonId: z.number(),
        candidateName: z.string().min(1),
        candidatePhone: z.string().min(1),
        notes: z.string().optional(),
        bountyAmount: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createReferral(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "referral", entityId: id, afterValue: input });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ input, ctx }) => {
        await db.updateReferral(input.id, input.data);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "update", entityType: "referral", entityId: input.id, afterValue: input.data });
        return { success: true };
      }),
  }),

  // ─── ID Cards ──────────────────────────────────────────────────────
  idCards: router({
    list: protectedProcedure
      .input(z.object({ personId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listIdCards(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        personId: z.number(),
        cardNumber: z.string().min(1),
        qrToken: z.string().min(1),
        designation: z.string().optional(),
        propertyId: z.number().optional(),
        validFrom: z.string().optional(),
        validUntil: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createIdCard(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "id_card", entityId: id, afterValue: input });
        return { id };
      }),
    revoke: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateIdCard(input.id, { status: "revoked" });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "revoke", entityType: "id_card", entityId: input.id });
        return { success: true };
      }),
  }),

  // ─── Contracts ─────────────────────────────────────────────────────
  contracts: router({
    list: protectedProcedure
      .input(z.object({ personId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listContracts(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        personId: z.number(),
        templateId: z.number().optional(),
        contractType: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createContract(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "contract", entityId: id, afterValue: input });
        return { id };
      }),
    templates: protectedProcedure.query(async () => db.listContractTemplates()),
    generate: protectedProcedure
      .input(z.object({
        contractId: z.number(),
        templateId: z.number(),
        mergeValues: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const contract = await db.getContractById(input.contractId);
        if (!contract) throw new Error("Contract not found");
        const templates = await db.listContractTemplates();
        const template = templates.find((t: any) => t.id === input.templateId);
        if (!template) throw new Error("Template not found");
        const person = await db.getPersonById(contract.personId);
        if (!person) throw new Error("Person not found");
        const mergeVals = input.mergeValues || buildMergeValues(person, { startDate: contract.effectiveFrom ? String(contract.effectiveFrom) : undefined, endDate: contract.effectiveTo ? String(contract.effectiveTo) : undefined });
        const bodyHtml = mergeTemplate(template.templateHtml || "<p>No template content</p>", mergeVals);
        const fullHtml = wrapContractHtml(bodyHtml, `${template.label} - ${person.fullName}`);
        const stored = await storeContractDocument(input.contractId, fullHtml, `${template.code}-${person.fullName.replace(/\s+/g, "_")}.html`);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "generate", entityType: "contract", entityId: input.contractId, afterValue: { templateId: input.templateId, documentUrl: stored.url } });
        return { documentUrl: stored.url };
      }),
    createTemplate: protectedProcedure
      .input(z.object({ name: z.string().min(1), contractType: z.string(), bodyHtml: z.string().optional(), variables: z.unknown().optional() }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createContractTemplate({ ...input, active: true });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "contract_template", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Performance ───────────────────────────────────────────────────
  performance: router({
    reviews: protectedProcedure
      .input(z.object({ personId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listPerformanceReviews(input ?? {})),
    createReview: protectedProcedure
      .input(z.object({
        personId: z.number(),
        reviewPeriodStart: z.string(),
        reviewPeriodEnd: z.string(),
        reviewData: z.unknown().optional(),
        outcome: z.enum(["increment", "promotion", "pip", "exit", "no_change"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createPerformanceReview({ ...input, reviewerId: ctx.user.id });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "performance_review", entityId: id, afterValue: input });
        return { id };
      }),
    feedback: protectedProcedure
      .input(z.object({ personId: z.number().optional(), type: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listFeedback(input ?? {})),
    createFeedback: protectedProcedure
      .input(z.object({
        personId: z.number(),
        type: z.enum(["appreciation", "complaint", "observation"]),
        description: z.string(),
        propertyId: z.number().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createFeedback(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "feedback", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Onboarding ────────────────────────────────────────────────────
  onboarding: router({
    list: protectedProcedure
      .input(z.object({ personId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listOnboardingChecklists(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        personId: z.number(),
        templateName: z.string().optional(),
        items: z.unknown(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createOnboardingChecklist(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "onboarding_checklist", entityId: id, afterValue: input });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ input, ctx }) => {
        await db.updateOnboardingChecklist(input.id, input.data);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "update", entityType: "onboarding_checklist", entityId: input.id, afterValue: input.data });
        return { success: true };
      }),
  }),

  // ─── Breakages ─────────────────────────────────────────────────────
  breakages: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listBreakages(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        inventoryItemId: z.number().optional(),
        description: z.string().min(1),
        attributedTo: z.number().optional(),
        attributionStatus: z.enum(["unattributed", "associate", "guest", "accidental", "wear"]).optional(),
        estimatedCost: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createBreakage({ ...input, photoUrls: input.photoUrls ?? [] });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "breakage", entityId: id, afterValue: input });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), data: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ input, ctx }) => {
        await db.updateBreakage(input.id, input.data);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "update", entityType: "breakage", entityId: input.id, afterValue: input.data });
        return { success: true };
      }),
  }),

  // ─── Leave Policies ────────────────────────────────────────────────
  leavePolicies: router({
    list: protectedProcedure.query(async () => db.listLeavePolicies()),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        leaveType: z.string(),
        annualQuota: z.number(),
        accrualType: z.enum(["monthly", "quarterly", "annual", "none"]).optional(),
        carryForwardMax: z.number().optional(),
        encashable: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createLeavePolicy({ ...input, active: true });
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "leave_policy", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Monthly Reports ───────────────────────────────────────────────
  monthlyReports: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), ownerId: z.number().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listMonthlyReports(input ?? {})),
  }),

  // ─── Requests (Owner Portal) ───────────────────────────────────
  requests: router({
    list: protectedProcedure
      .input(z.object({ propertyId: z.number().optional(), ownerId: z.number().optional(), status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.listRequests(input ?? {})),
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        ownerId: z.number(),
        type: z.string(),
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createRequest(input);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "create", entityType: "request", entityId: id, afterValue: input });
        return { id };
      }),
  }),

  // ─── Settlement (F&F) ────────────────────────────────────────────
  settlement: router({
    calculate: protectedProcedure
      .input(z.object({
        monthlySalary: z.number(),
        dailyRate: z.number().optional(),
        lastWorkingDay: z.string(),
        salaryPaidThrough: z.string(),
        unusedLeaveDays: z.number(),
        leaveEncashable: z.boolean(),
        noticePeriodDays: z.number(),
        noticePeriodServed: z.number(),
        salaryAdvanceOutstanding: z.number(),
        breakageDeductions: z.number(),
        bonusAmount: z.number(),
        gratuityAmount: z.number(),
        otherDeductions: z.number(),
        otherEarnings: z.number(),
      }))
      .mutation(async ({ input }) => {
        return calculateFnF(input as FnFInput);
      }),
  }),

  // ─── File Upload ────────────────────────────────────────────────
  upload: router({
    file: protectedProcedure
      .input(z.object({
        module: z.enum(["attendance", "expenses", "breakages", "contracts", "idcards", "properties", "dailyops", "people"]),
        entityId: z.string(),
        filename: z.string(),
        data: z.string(), // base64 encoded
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.data, "base64");
        const validationError = validateUpload(buffer, input.mimeType);
        if (validationError) throw new Error(validationError);
        const result = await uploadModuleFile(input.module as MediaModule, input.entityId, input.filename, buffer, input.mimeType);
        await db.writeAuditLog({ actorId: ctx.user.id, actorRole: ctx.user.role, action: "upload", entityType: input.module, entityId: parseInt(input.entityId) || 0, afterValue: { filename: input.filename, url: result.url } });
        return result;
      }),
  }),

  // ─── Anomaly Detection ─────────────────────────────────────────
  anomalies: router({
    dashboard: protectedProcedure.query(async () => {
      const anomalyData = await db.getAnomalyData();
      return anomalyData;
    }),
  }),

  // ─── Audit Log ──────────────────────────────────────────────────
  auditLog: router({
    list: protectedProcedure
      .input(z.object({ entityType: z.string().optional(), entityId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => db.getAuditLogs(input ?? {})),
  }),
});

export type AppRouter = typeof appRouter;
