import { randomUUID } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or, count, ne } from "drizzle-orm";
import { router, rolesProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, type User } from "../../drizzle/schema";
import { generateMagicLink } from "../services/auth";
import { sendEmail, magicLinkEmail } from "../services/email";
import { ENV } from "../_core/env";

const ROLES = [
  "super_admin",
  "central_admin",
  "ops_lead",
  "supply_lead",
  "finance_admin",
  "property_manager",
  "supervisor",
  "associate",
  "owner_portal",
] as const;

type Role = (typeof ROLES)[number];

const ADMIN_ROLES = ["super_admin", "central_admin"];

const roleSchema = z.enum(ROLES);

function sanitize(u: User) {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    lastSignedInAt: u.lastSignedInAt ? u.lastSignedInAt.toISOString() : null,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    updatedAt: u.updatedAt ? u.updatedAt.toISOString() : null,
  };
}

const listInput = z
  .object({
    search: z.string().max(255).optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).default(100),
    offset: z.number().int().min(0).default(0),
  })
  .optional();

const listUsers = rolesProcedure(...ADMIN_ROLES)
  .input(listInput)
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { users: [] as ReturnType<typeof sanitize>[], total: 0 };

    const opts = input ?? { limit: 100, offset: 0 };
    const limit = opts.limit ?? 100;
    const offset = opts.offset ?? 0;

    const conditions = [];
    if (opts.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(like(users.email, term), like(users.name, term), like(users.phone, term)));
    }
    if (opts.role) conditions.push(eq(users.role, opts.role));
    if (opts.isActive !== undefined) conditions.push(eq(users.isActive, opts.isActive));

    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ value: total = 0 } = { value: 0 }] = await db
      .select({ value: count() })
      .from(users)
      .where(where);

    return {
      users: rows.map(sanitize),
      total: Number(total),
    };
  });

const roleCounts = rolesProcedure(...ADMIN_ROLES).query(async () => {
  const db = await getDb();
  if (!db) {
    return Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
  }
  const rows = await db
    .select({ role: users.role, value: count() })
    .from(users)
    .where(eq(users.isActive, true))
    .groupBy(users.role);

  const out = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
  for (const r of rows) {
    if (r.role in out) out[r.role as Role] = Number(r.value);
  }
  return out;
});

const createUser = rolesProcedure(...ADMIN_ROLES)
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().min(1).max(255),
      phone: z.string().max(20).optional(),
      role: roleSchema,
      sendMagicLink: z.boolean().default(true),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone?.replace(/\s/g, "") || null;

    if (input.role === "associate" && !phone) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Associate users must have a phone number for OTP login",
      });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail) {
      throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
    }
    if (phone) {
      const [existingPhone] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (existingPhone) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this phone already exists" });
      }
    }

    const id = randomUUID();
    await db.insert(users).values({
      id,
      email,
      phone,
      name: input.name,
      role: input.role,
      isActive: true,
    });

    let magicLinkSent = false;
    if (input.sendMagicLink && input.role !== "associate") {
      try {
        const { token } = await generateMagicLink(id, "first_login_setup");
        const base = ENV.isProduction ? `https://${ENV.staffHostname}` : "http://localhost:3000";
        const url = `${base}/auth/magic?token=${token}`;
        const tmpl = magicLinkEmail(input.name, url, 15);
        const result = await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
        if (result.ok) {
          magicLinkSent = true;
        } else {
          console.error("[users.createUser] magic-link send failed:", result.error);
        }
      } catch (err) {
        console.error("[users.createUser] magic-link send threw:", err);
      }
    }

    const [created] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return { user: created ? sanitize(created) : null, magicLinkSent };
  });

const updateUser = rolesProcedure(...ADMIN_ROLES)
  .input(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      phone: z.string().max(20).nullable().optional(),
      role: roleSchema.optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [target] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    if (input.role && input.role !== target.role) {
      if (target.id === ctx.user.id && target.role === "super_admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own super_admin role",
        });
      }
      if (target.role === "super_admin") {
        const [{ value: superAdminCount = 0 } = { value: 0 }] = await db
          .select({ value: count() })
          .from(users)
          .where(and(eq(users.role, "super_admin"), eq(users.isActive, true), ne(users.id, target.id)));
        if (Number(superAdminCount) === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot demote the last active super_admin",
          });
        }
      }
    }

    const phone = input.phone === undefined ? undefined : input.phone?.replace(/\s/g, "") || null;
    if (phone) {
      const [conflict] = await db
        .select()
        .from(users)
        .where(and(eq(users.phone, phone), ne(users.id, input.id)))
        .limit(1);
      if (conflict) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this phone already exists" });
      }
    }

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (phone !== undefined) patch.phone = phone;
    if (input.role !== undefined) patch.role = input.role;

    if (Object.keys(patch).length > 0) {
      await db.update(users).set(patch).where(eq(users.id, input.id));
    }

    const [updated] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
    return { user: updated ? sanitize(updated) : null };
  });

const setActive = rolesProcedure(...ADMIN_ROLES)
  .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    if (input.id === ctx.user.id && !input.isActive) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot deactivate your own account",
      });
    }

    const [target] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    if (!input.isActive && target.role === "super_admin") {
      const [{ value: superAdminCount = 0 } = { value: 0 }] = await db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "super_admin"), eq(users.isActive, true), ne(users.id, target.id)));
      if (Number(superAdminCount) === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot deactivate the last active super_admin",
        });
      }
    }

    await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.id));
    const [updated] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
    return { user: updated ? sanitize(updated) : null };
  });

const sendMagicLink = rolesProcedure(...ADMIN_ROLES)
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [target] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    if (!target.isActive) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User is deactivated" });
    }
    if (target.role === "associate") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Associates use OTP login, not magic links",
      });
    }

    try {
      const { token } = await generateMagicLink(target.id, "login");
      const base = ENV.isProduction ? `https://${ENV.staffHostname}` : "http://localhost:3000";
      const url = `${base}/auth/magic?token=${token}`;
      const tmpl = magicLinkEmail(target.name ?? "there", url, 15);
      const result = await sendEmail({ to: target.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
      if (!result.ok) {
        console.error("[users.sendMagicLink] send failed:", result.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Email delivery failed${result.error ? `: ${result.error}` : ""}`,
        });
      }
      return { ok: true };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      console.error("[users.sendMagicLink] threw:", err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not send magic link" });
    }
  });

export const usersRouter = router({
  list: listUsers,
  roleCounts,
  create: createUser,
  update: updateUser,
  setActive,
  sendMagicLink,
});
