/**
 * Pilot data seed for the Firebrick May 15 attendance launch.
 *
 * Run manually against the target DB; never wired into startup or migration
 * hooks. The script is idempotent — re-running rotates passwords (intentional,
 * so the CSV always reflects current credentials) but does not duplicate rows.
 *
 * Usage:
 *   DATABASE_URL=mysql://... pnpm db:seed:pilot
 *   PILOT_XLSX_PATH=/path/to/file.xlsx pnpm db:seed:pilot   # override input
 *
 * Output:
 *   scripts/seed-pilot-output/staff-credentials.csv
 *   scripts/seed-pilot-output/associate-credentials.csv
 *   scripts/seed-pilot-output/summary.json
 */

import "dotenv/config";
import { randomUUID, randomBytes, randomInt } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { and, eq, sql } from "drizzle-orm";
import { getDb, closeDb } from "../server/db";
import {
  users,
  authCredentials,
  people,
  properties,
  owners,
  propertyOwners,
  assignments,
} from "../drizzle/schema";

// ─── Configuration ──────────────────────────────────────────────────
const XLSX_PATH = process.env.PILOT_XLSX_PATH ?? "/tmp/Firebrick_Attendance_Pilot_Data.xlsx";
const OUTPUT_DIR = join(process.cwd(), "scripts", "seed-pilot-output");
const STAFF_CSV = join(OUTPUT_DIR, "staff-credentials.csv");
const ASSOC_CSV = join(OUTPUT_DIR, "associate-credentials.csv");
const SUMMARY_JSON = join(OUTPUT_DIR, "summary.json");

const AJIT_EMAIL = "ajit@firebrick.one";
const AJIT_NAME = "Ajit Mahadev Sawant";
const SUPERVISOR_DESIGNATION_RE = /supervisor|apm|assistant property manager|captain|senior housekeeper/i;
const BCRYPT_COST = 12;
const VALID_USER_ROLES = new Set([
  "super_admin", "central_admin", "ops_lead", "supply_lead",
  "finance_admin", "property_manager", "supervisor", "associate", "owner_portal",
]);

// ─── Normalisation utilities (per Part 2 of spec) ───────────────────
const normWhitespace = (s: string) => s.split(/\s+/).filter(Boolean).join(" ");
const normPhone = (s: string) => s.replace(/^['"]/, "").trim();
const isValidPhone = (s: string) => /^\+91\d{10}$/.test(s);
const lookupKey = (s: string) => normWhitespace(s).toLowerCase();

const toStr = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v).trim();

const cellEmpty = (v: unknown): boolean => {
  const s = toStr(v);
  return s === "" || s === "0";
};

function coerceDecimal(v: unknown): number | null {
  const s = toStr(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function coerceInt(v: unknown): number | null {
  const s = toStr(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function coerceBool(v: unknown): boolean | null {
  const s = toStr(v).toLowerCase();
  if (!s) return null;
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return null;
}

// Excel serial date → "YYYY-MM-DD" (MySQL DATE format)
function excelSerialToDateStr(v: unknown): string | null {
  const s = toStr(v);
  if (!s) return null;
  // Allow already-formatted date strings to pass through.
  const dateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) return dateMatch[0];
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Excel epoch is 1899-12-30 (accounting for the 1900 leap-year bug).
  const ms = Date.UTC(1899, 11, 30) + Math.floor(n) * 86_400_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generatePassword(): string {
  return randomBytes(12).toString("base64").replace(/[+/=]/g, "A").slice(0, 16);
}

// Associate login UI restricts input to `\d{6}` (numeric, exactly 6 chars),
// so associates need a 6-digit PIN — not the 16-char alphanumeric password
// used for staff. Leading zeros are preserved in the string form.
function generatePin(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// `people.primaryPhone` is varchar(20). A `LIKE 'INVALID-%'` query identifies
// any row needing post-pilot correction; the D / M letter distinguishes the
// duplicate vs malformed cause. The suffix is truncated to fit the column.
function placeholderPhone(kind: "D" | "M", key: string): string {
  return `INVALID-${kind}-${key.slice(0, 10)}`;
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function csvLine(cols: string[]): string {
  return cols.map(csvEscape).join(",") + "\n";
}

// ─── Logging ────────────────────────────────────────────────────────
const warnings: string[] = [];
const errors: string[] = [];
const info = (msg: string) => console.log(`[seed] INFO: ${msg}`);
const warn = (msg: string) => {
  console.warn(`[seed] WARN: ${msg}`);
  warnings.push(msg);
};
const errLog = (msg: string) => {
  console.error(`[seed] ERROR: ${msg}`);
  errors.push(msg);
};

// Resolve a PM scope fragment to one property. Strategy, in order:
// 1. exact lookupKey match
// 2. lookupKey substring match (fragment substring of property name)
// 3. token-overlap match: split into words, score by intersection; require
//    >= ceil(half) of fragment words to overlap AND a unique top scorer.
// Returning null means caller logs an ERROR — no auto-skip semantics.
function fuzzyPropertyMatch(
  fragment: string,
  propertyByKey: Map<string, { id: string; lookupKey: string; displayName: string }>,
  contextLabel: string,
): { id: string; lookupKey: string; displayName: string } | null {
  const fragKey = lookupKey(fragment);
  if (!fragKey) return null;

  // 1. Exact key match
  const exact = propertyByKey.get(fragKey);
  if (exact) return exact;

  // 2. Substring match
  const substrMatches = Array.from(propertyByKey.values()).filter((p) =>
    p.lookupKey.includes(fragKey),
  );
  if (substrMatches.length === 1) return substrMatches[0];
  if (substrMatches.length > 1) {
    errLog(`PM fuzzy: fragment '${fragment}' (${contextLabel}) matches multiple properties via substring (${substrMatches.map((m) => m.displayName).join("; ")})`);
    return null;
  }

  // 3. Token-overlap match
  const fragWords = new Set(
    fragKey.split(/\s+/).filter((w) => w.length >= 2 && w !== "-"),
  );
  if (fragWords.size === 0) return null;
  const required = Math.ceil(fragWords.size / 2);

  let bestScore = 0;
  let bestProps: { id: string; lookupKey: string; displayName: string }[] = [];
  for (const prop of propertyByKey.values()) {
    const propWords = new Set(prop.lookupKey.split(/[\s-]+/).filter(Boolean));
    let score = 0;
    for (const w of fragWords) if (propWords.has(w)) score++;
    if (score > bestScore) {
      bestScore = score;
      bestProps = [prop];
    } else if (score === bestScore && score > 0) {
      bestProps.push(prop);
    }
  }

  if (bestScore >= required && bestProps.length === 1) {
    return bestProps[0];
  }
  if (bestProps.length > 1 && bestScore >= required) {
    errLog(`PM fuzzy: fragment '${fragment}' (${contextLabel}) matches multiple properties via token overlap (${bestProps.map((m) => m.displayName).join("; ")})`);
  }
  return null;
}

// ─── Counters for summary.json ──────────────────────────────────────
const counters = {
  properties: { created: 0, updated: 0, skipped: 0 },
  owners: { created: 0, updated: 0, skipped: 0, property_links: 0 },
  staff: { created: 0, updated: 0, skipped_placeholders: 0 },
  associates: {
    created: 0,
    updated: 0,
    skipped_no_property: 0,
    phone_duplicates_nulled: 0,
    email_duplicates_nulled: 0,
  },
  assignments: { created: 0 },
};

// ─── Sheet row parsing ──────────────────────────────────────────────
type RawRow = Record<string, unknown>;

function readSheet(workbook: XLSX.WorkBook, name: string): RawRow[] {
  const ws = workbook.Sheets[name];
  if (!ws) throw new Error(`Sheet '${name}' not found in workbook`);
  const all = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true }) as RawRow[];
  return all.filter((r) => Object.values(r).some((v) => toStr(v) !== ""));
}

// ─── CSV row buffers (flushed only on successful commit) ────────────
const staffCsvRows: string[][] = [];
const associateCsvRows: string[][] = [];

// ─── Phase A: Properties ────────────────────────────────────────────
type PropertyRow = {
  id: string;
  lookupKey: string;
  displayName: string;
};

async function seedProperties(tx: any, rows: RawRow[]): Promise<Map<string, PropertyRow>> {
  const byKey = new Map<string, PropertyRow>();
  for (const row of rows) {
    const rawName = toStr(row["name"]);
    if (!rawName) {
      counters.properties.skipped++;
      continue;
    }
    const displayName = rawName.replace(/\s+$/g, ""); // trim trailing whitespace for display
    const key = lookupKey(rawName);
    const city = toStr(row["city"]) || null;
    const state = toStr(row["state"]) || null;
    const address = toStr(row["address"]) || null;
    const latRaw = toStr(row["latitude"]);
    const lonRaw = toStr(row["longitude"]);
    const latEmpty = latRaw === "";
    const lonEmpty = lonRaw === "";
    const lat = latEmpty ? null : coerceDecimal(latRaw);
    const lon = lonEmpty ? null : coerceDecimal(lonRaw);
    // If EITHER lat or lon is blank, force NULL on both AND lenient=TRUE (bench).
    const gpsBlank = latEmpty || lonEmpty;
    const gpsLat = gpsBlank ? null : lat?.toFixed(7) ?? null;
    const gpsLng = gpsBlank ? null : lon?.toFixed(7) ?? null;
    const radius = coerceInt(row["geofence_radius_meters"]) ?? 100;
    const sheetLenient = coerceBool(row["geofence_lenient"]);
    const lenient = gpsBlank ? true : sheetLenient ?? false;
    const weeklyOff = toStr(row["weekly_off_days"]);
    const weeklyOffDays = weeklyOff === "" ? null : weeklyOff;
    const minDailyWork = coerceInt(row["min_daily_work_minutes"]) ?? 360;

    const [existing] = await tx
      .select({ id: properties.id, name: properties.name })
      .from(properties);
    // SELECT all + filter in JS is wasteful for big tables, but Properties is 25 rows.
    const match = (await tx.select().from(properties)).find(
      (p: any) => lookupKey(toStr(p.name)) === key,
    );

    const baseValues = {
      name: displayName,
      type: "villa" as const, // B4: default to 'villa' for all
      address,
      city,
      state,
      gpsLat,
      gpsLng,
      geofenceRadiusM: radius,
      geofenceLenient: lenient,
      weeklyOffDays: weeklyOffDays as any, // stored as JSON; raw string for now
      minimumDailyWorkMinutes: minDailyWork,
    };

    if (match) {
      await tx.update(properties).set(baseValues).where(eq(properties.id, match.id));
      counters.properties.updated++;
      info(`Phase A: updated properties '${displayName}' as ${match.id}`);
      byKey.set(key, { id: match.id, lookupKey: key, displayName });
    } else {
      const id = randomUUID();
      await tx.insert(properties).values({ id, ...baseValues });
      counters.properties.created++;
      info(`Phase A: created properties '${displayName}' as ${id}`);
      byKey.set(key, { id, lookupKey: key, displayName });
    }
  }
  return byKey;
}

// ─── Phase B: Owners ────────────────────────────────────────────────
type OwnerRow = {
  id: string;
  userId: string | null;
  displayName: string;
  isAjit: boolean;
};

// Build map of (unique owner name) → [all spreadsheet rows for that company]
function groupOwnerRows(rows: RawRow[]): Map<string, RawRow[]> {
  const groups = new Map<string, RawRow[]>();
  for (const row of rows) {
    const name = toStr(row["full_name"]);
    if (!name) continue;
    const key = lookupKey(name);
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }
  return groups;
}

async function seedOwners(
  tx: any,
  rows: RawRow[],
  propertyByKey: Map<string, PropertyRow>,
  phoneSeen: Map<string, string>,
  emailSeen: Map<string, string>,
): Promise<{ ownerByKey: Map<string, OwnerRow>; ajitUserId: string | null }> {
  const ownerByKey = new Map<string, OwnerRow>();
  const groups = groupOwnerRows(rows);
  let ajitUserId: string | null = null;

  const allExisting = await tx.select().from(owners);

  for (const [key, ownerRows] of groups) {
    const first = ownerRows[0];
    const displayName = toStr(first["full_name"]).replace(/\s+$/g, "");
    const phoneRaw = normPhone(toStr(first["phone"]));
    let phone: string | null = phoneRaw && isValidPhone(phoneRaw) ? phoneRaw : null;
    if (phoneRaw && !phone) {
      warn(`Phase B: owner '${displayName}' has invalid phone '${phoneRaw}', nulling`);
    }
    const emailRaw = toStr(first["email"]).toLowerCase();
    const email = emailRaw || null;
    const isAjit = key === lookupKey(AJIT_NAME);

    // For Ajit only, also seed a users row so currentSupervisorId fallback works.
    let userId: string | null = null;
    if (isAjit) {
      const ajitEmail = AJIT_EMAIL;
      const ajitPhone = phone;
      // Look up existing user
      const [existingUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, ajitEmail))
        .limit(1);
      if (existingUser) {
        const updates: Record<string, unknown> = {
          name: AJIT_NAME,
          role: "ops_lead",
          isActive: true,
        };
        // Only set phone if not already claimed by someone else (uniqueness).
        if (ajitPhone && !phoneSeen.has(ajitPhone)) {
          updates.phone = ajitPhone;
          phoneSeen.set(ajitPhone, `owner:${AJIT_EMAIL}`);
        }
        await tx.update(users).set(updates).where(eq(users.id, existingUser.id));
        userId = existingUser.id;
        emailSeen.set(ajitEmail, `owner:${AJIT_EMAIL}`);
      } else {
        userId = randomUUID();
        const insertValues: Record<string, unknown> = {
          id: userId,
          email: ajitEmail,
          name: AJIT_NAME,
          role: "ops_lead",
          isActive: true,
        };
        if (ajitPhone && !phoneSeen.has(ajitPhone)) {
          insertValues.phone = ajitPhone;
          phoneSeen.set(ajitPhone, `owner:${AJIT_EMAIL}`);
        }
        await tx.insert(users).values(insertValues);
        emailSeen.set(ajitEmail, `owner:${AJIT_EMAIL}`);
        info(`Phase B: created users (owner-fallback) '${AJIT_EMAIL}' as ${userId}`);
      }
      ajitUserId = userId;
    }

    const ownerValues: Record<string, unknown> = {
      name: displayName,
      phone,
      email,
      userId,
      status: "active" as const,
    };

    const match = allExisting.find((o: any) => lookupKey(toStr(o.name)) === key);
    let ownerId: string;
    if (match) {
      await tx.update(owners).set(ownerValues).where(eq(owners.id, match.id));
      ownerId = match.id;
      counters.owners.updated++;
      info(`Phase B: updated owners '${displayName}' as ${ownerId}`);
    } else {
      ownerId = randomUUID();
      await tx.insert(owners).values({ id: ownerId, ...ownerValues });
      counters.owners.created++;
      info(`Phase B: created owners '${displayName}' as ${ownerId}`);
    }

    ownerByKey.set(key, { id: ownerId, userId, displayName, isAjit });

    // Resolve all property_names tokens across every spreadsheet row for this owner.
    const linkedSet = new Set<string>();
    const existingLinks = await tx
      .select()
      .from(propertyOwners)
      .where(eq(propertyOwners.ownerId, ownerId));
    const existingPropIds = new Set(existingLinks.map((l: any) => l.propertyId));

    for (let i = 0; i < ownerRows.length; i++) {
      const r = ownerRows[i];
      const propNames = toStr(r["property_names"]);
      if (!propNames) continue;
      const tokens = propNames.split(",").map((t) => t.trim()).filter(Boolean);
      for (const token of tokens) {
        const tKey = lookupKey(token);
        const prop = propertyByKey.get(tKey);
        if (!prop) {
          warn(`Phase B: owner '${displayName}' row ${i + 1} token '${token}' has no property match, skipping`);
          continue;
        }
        if (linkedSet.has(prop.id) || existingPropIds.has(prop.id)) continue;
        linkedSet.add(prop.id);
        await tx.insert(propertyOwners).values({
          id: randomUUID(),
          propertyId: prop.id,
          ownerId,
        });
        counters.owners.property_links++;
        info(`Phase B: linked property_owners ${prop.displayName} ↔ ${displayName}`);
      }
    }
  }

  return { ownerByKey, ajitUserId };
}

// ─── Phase C: Staff ─────────────────────────────────────────────────
async function seedStaff(
  tx: any,
  rows: RawRow[],
  propertyByKey: Map<string, PropertyRow>,
  phoneSeen: Map<string, string>,
  emailSeen: Map<string, string>,
): Promise<void> {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = toStr(row["email"]).toLowerCase();
    const role = toStr(row["role"]);
    const fullName = toStr(row["full_name"]);
    const notes = toStr(row["notes"]);

    if (!email || !role) {
      counters.staff.skipped_placeholders++;
      info(`Phase C: skipping placeholder staff row ${i + 1} (name='${fullName}' notes='${notes}')`);
      continue;
    }

    if (!VALID_USER_ROLES.has(role)) {
      errLog(`Phase C: staff row ${i + 1} ('${email}') has invalid role '${role}'; must be one of super_admin/ops_lead/property_manager. Skipping.`);
      counters.staff.skipped_placeholders++;
      continue;
    }

    const phoneRaw = normPhone(toStr(row["phone"]));
    const staffKey = email.split("@")[0]; // local-part as identifier for placeholder
    let usersPhone: string | null = null;
    let peoplePhone: string;
    if (phoneRaw && isValidPhone(phoneRaw)) {
      if (phoneSeen.has(phoneRaw)) {
        warn(`Phase C: staff row ${i + 1} ('${email}') has duplicate phone '${phoneRaw}' (also ${phoneSeen.get(phoneRaw)}), nulling for users.phone`);
        usersPhone = null;
        peoplePhone = placeholderPhone("D", staffKey);
      } else {
        usersPhone = phoneRaw;
        peoplePhone = phoneRaw;
        phoneSeen.set(phoneRaw, `staff:${email}`);
      }
    } else if (phoneRaw) {
      warn(`Phase C: staff row ${i + 1} ('${email}') has invalid phone '${phoneRaw}', nulling for users.phone`);
      usersPhone = null;
      peoplePhone = placeholderPhone("M", staffKey);
    } else {
      usersPhone = null;
      peoplePhone = placeholderPhone("M", staffKey);
    }

    // Email collision check
    if (emailSeen.has(email)) {
      errLog(`Phase C: staff row ${i + 1} email '${email}' duplicates ${emailSeen.get(email)}. Skipping row.`);
      counters.staff.skipped_placeholders++;
      continue;
    }
    emailSeen.set(email, `staff:${email}`);

    const designation = toStr(row["designation"]) || null;
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // Upsert user by email
    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;
    let staffCreated = false;
    const usersFields: Record<string, unknown> = {
      email,
      name: fullName,
      role: role as any,
      isActive: true,
    };
    if (usersPhone) usersFields.phone = usersPhone;
    else usersFields.phone = null;

    if (existingUser) {
      userId = existingUser.id;
      await tx.update(users).set(usersFields).where(eq(users.id, userId));
      counters.staff.updated++;
      info(`Phase C: updated users '${email}' as ${userId}`);
    } else {
      userId = randomUUID();
      await tx.insert(users).values({ id: userId, ...usersFields });
      counters.staff.created++;
      staffCreated = true;
      info(`Phase C: created users '${email}' as ${userId}`);
    }

    // Upsert auth_credentials (rotate hash every run intentionally)
    const [existingCred] = await tx
      .select({ id: authCredentials.id })
      .from(authCredentials)
      .where(eq(authCredentials.userId, userId))
      .limit(1);
    if (existingCred) {
      await tx
        .update(authCredentials)
        .set({ passwordHash, passwordSetAt: new Date(), failedAttempts: 0, lockedUntil: null })
        .where(eq(authCredentials.id, existingCred.id));
      info(`Phase C: updated auth_credentials for '${email}' (password rotated)`);
    } else {
      await tx.insert(authCredentials).values({
        id: randomUUID(),
        userId,
        passwordHash,
      });
      info(`Phase C: created auth_credentials for '${email}'`);
    }

    // Upsert people row keyed by userId
    const [existingPerson] = await tx
      .select({ id: people.id })
      .from(people)
      .where(eq(people.userId, userId))
      .limit(1);

    const peopleFields: Record<string, unknown> = {
      userId,
      fullName,
      primaryPhone: peoplePhone,
      email: email || null,
      staffType: "full_time" as const,
      employmentType: "permanent" as const,
      employmentStatus: "active" as const,
      designation,
    };
    let personId: string;
    if (existingPerson) {
      personId = existingPerson.id;
      await tx.update(people).set(peopleFields).where(eq(people.id, personId));
      info(`Phase C: updated people for staff '${email}' as ${personId}`);
    } else {
      personId = randomUUID();
      await tx.insert(people).values({ id: personId, ...peopleFields });
      info(`Phase C: created people for staff '${email}' as ${personId}`);
    }

    // Property scope (PM only)
    if (role === "property_manager" && notes) {
      const fragments = notes.split(",").map((t) => t.trim()).filter(Boolean);
      for (const frag of fragments) {
        const prop = fuzzyPropertyMatch(frag, propertyByKey, email);
        if (!prop) {
          errLog(`Phase C: PM scope fragment '${frag}' (staff '${email}') matches no property. Skipping.`);
          continue;
        }
        // Idempotency: check active assignment exists
        const existingAssign = await tx
          .select({ id: assignments.id })
          .from(assignments)
          .where(
            and(
              eq(assignments.personId, personId),
              eq(assignments.propertyId, prop.id),
              eq(assignments.roleCode, "property_manager"),
              eq(assignments.status, "active"),
            ),
          )
          .limit(1);
        if (existingAssign.length === 0) {
          await tx.insert(assignments).values({
            id: randomUUID(),
            personId,
            propertyId: prop.id,
            roleCode: "property_manager",
            startDate: new Date().toISOString().slice(0, 10),
            status: "active",
          });
          counters.assignments.created++;
          info(`Phase C: created assignment ${prop.displayName} ← ${email} (property_manager)`);
        }
      }
    }

    if (staffCreated) {
      staffCsvRows.push([email, fullName, role, password, designation ?? ""]);
    } else {
      // For idempotent re-runs, still produce the row with the rotated password.
      staffCsvRows.push([email, fullName, role, password, designation ?? ""]);
    }
  }
}

// ─── Phase D: Associates ────────────────────────────────────────────
type AssociateDraft = {
  rowIndex: number;
  employeeCode: string;
  fullName: string;
  email: string | null;
  emailWasReal: boolean;
  designation: string;
  systemRole: "associate" | "supervisor";
  propertyId: string;
  propertyKey: string;
  propertyDisplayName: string;
  password: string;
  passwordHash: string;
  usersPhone: string | null;
  peoplePhone: string;
  employmentTypeRaw: string;
  employmentType: "contract" | "permanent" | "probation" | "trainee";
  joiningDate: string | null;
  dob: string | null;
  aadhaarLast4: string | null;
  emergencyContact: { name: string | null; phone: string | null } | null;
};

function mapEmploymentType(raw: string): "contract" | "permanent" | "probation" | "trainee" {
  const lower = raw.toLowerCase();
  if (lower === "associate") return "contract"; // B3: silent INFO upstream, not warning
  if (lower === "permanent") return "permanent";
  if (lower === "trainee") return "trainee";
  if (lower === "contract") return "contract";
  if (lower === "probation") return "probation";
  warn(`Phase D: unknown employment_type '${raw}', defaulting to 'contract'`);
  return "contract";
}

async function seedAssociates(
  tx: any,
  rows: RawRow[],
  propertyByKey: Map<string, PropertyRow>,
  phoneSeen: Map<string, string>,
  emailSeen: Map<string, string>,
  ajitUserId: string | null,
): Promise<void> {
  // First pass: build drafts. Validates phones/emails, resolves property, derives roles.
  const drafts: AssociateDraft[] = [];
  let infoEmploymentAssociate = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fullName = toStr(row["full_name"]).replace(/\s+$/g, "");
    const employeeCode = toStr(row["id_card_number"]);
    if (!employeeCode) {
      counters.associates.skipped_no_property++;
      errLog(`Phase D: row ${i + 1} ('${fullName}') has no id_card_number, skipping`);
      continue;
    }

    const propertyName = toStr(row["property_assigned"]);
    const propertyKey = lookupKey(propertyName);
    const prop = propertyByKey.get(propertyKey);
    if (!prop) {
      counters.associates.skipped_no_property++;
      errLog(`Phase D: row ${i + 1} ('${fullName}', code=${employeeCode}) has no property match for '${propertyName}', skipping`);
      continue;
    }

    // Phone
    const phoneRaw = normPhone(toStr(row["phone"]));
    let usersPhone: string | null = null;
    let peoplePhone: string;
    if (phoneRaw && isValidPhone(phoneRaw)) {
      if (phoneSeen.has(phoneRaw)) {
        warn(`Phase D: row ${i + 1} (code=${employeeCode}) has duplicate phone '${phoneRaw}' (also ${phoneSeen.get(phoneRaw)}), nulling for users.phone`);
        usersPhone = null;
        peoplePhone = placeholderPhone("D", employeeCode);
        counters.associates.phone_duplicates_nulled++;
      } else {
        usersPhone = phoneRaw;
        peoplePhone = phoneRaw;
        phoneSeen.set(phoneRaw, `associate:${employeeCode}`);
      }
    } else if (phoneRaw) {
      warn(`Phase D: row ${i + 1} (code=${employeeCode}) has invalid phone '${phoneRaw}', nulling for users.phone`);
      usersPhone = null;
      peoplePhone = placeholderPhone("M", employeeCode);
    } else {
      usersPhone = null;
      peoplePhone = placeholderPhone("M", employeeCode);
    }

    // Email
    const emailRaw = toStr(row["email"]).toLowerCase();
    let email: string | null;
    let emailWasReal = false;
    if (emailRaw && /\S+@\S+\.\S+/.test(emailRaw)) {
      if (emailSeen.has(emailRaw)) {
        warn(`Phase D: row ${i + 1} (code=${employeeCode}) has duplicate email '${emailRaw}' (also ${emailSeen.get(emailRaw)}), synthesizing fresh email`);
        email = `${employeeCode.toLowerCase()}@pilot.firebrick.local`;
        counters.associates.email_duplicates_nulled++;
      } else {
        email = emailRaw;
        emailWasReal = true;
        emailSeen.set(emailRaw, `associate:${employeeCode}`);
      }
    } else {
      if (emailRaw) {
        warn(`Phase D: row ${i + 1} (code=${employeeCode}) email '${emailRaw}' looks malformed, synthesizing`);
      }
      email = `${employeeCode.toLowerCase()}@pilot.firebrick.local`;
    }
    if (email && !emailSeen.has(email)) {
      emailSeen.set(email, `associate:${employeeCode}`);
    }

    const designation = toStr(row["role"]);
    const systemRole: "associate" | "supervisor" =
      SUPERVISOR_DESIGNATION_RE.test(designation) ? "supervisor" : "associate";

    const employmentTypeRaw = toStr(row["employment_type"]);
    if (employmentTypeRaw.toLowerCase() === "associate") infoEmploymentAssociate++;
    const employmentType = mapEmploymentType(employmentTypeRaw);

    const joiningDate = excelSerialToDateStr(row["date_of_joining"]);
    const dob = excelSerialToDateStr(row["date_of_birth"]);

    const aadhaarRaw = toStr(row["aadhaar_last_4"]);
    const aadhaarLast4 =
      aadhaarRaw && aadhaarRaw !== "0" && /^\d{1,4}$/.test(aadhaarRaw)
        ? aadhaarRaw.padStart(4, "0")
        : null;

    // Emergency contact
    const ecNameRaw = toStr(row["emergency_contact_name"]);
    const ecPhoneRaw = normPhone(toStr(row["emergency_contact_phone"]));
    const ecName = ecNameRaw && ecNameRaw !== "0" ? ecNameRaw : null;
    let ecPhone: string | null = null;
    if (ecPhoneRaw && ecPhoneRaw !== "0") {
      if (isValidPhone(ecPhoneRaw)) {
        ecPhone = ecPhoneRaw;
      } else {
        warn(`Phase D: row ${i + 1} (code=${employeeCode}) emergency phone '${ecPhoneRaw}' invalid, nulling`);
      }
    }
    const emergencyContact = ecName || ecPhone ? { name: ecName, phone: ecPhone } : null;

    // Associates authenticate via the AssociateLogin UI, which only accepts
    // 6-digit numeric PINs — use `generatePin()`, not `generatePassword()`.
    const password = generatePin();
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    drafts.push({
      rowIndex: i + 1,
      employeeCode,
      fullName,
      email,
      emailWasReal,
      designation,
      systemRole,
      propertyId: prop.id,
      propertyKey,
      propertyDisplayName: prop.displayName,
      password,
      passwordHash,
      usersPhone,
      peoplePhone,
      employmentTypeRaw,
      employmentType,
      joiningDate,
      dob,
      aadhaarLast4,
      emergencyContact,
    });
  }

  if (infoEmploymentAssociate > 0) {
    info(`Phase D: ${infoEmploymentAssociate} associates have employment_type='associate' → mapped to 'contract' (B3 mapping)`);
  }

  // First insertion pass: create users + auth_credentials + people (without currentSupervisorId)
  const personByEmployeeCode = new Map<string, { personId: string; userId: string; systemRole: string; propertyId: string }>();

  for (const d of drafts) {
    // Look up existing person by employeeCode (natural key)
    const [existingPerson] = await tx
      .select()
      .from(people)
      .where(eq(people.employeeCode, d.employeeCode))
      .limit(1);

    let userId: string;
    let personId: string;
    let didCreate = false;

    if (existingPerson) {
      personId = existingPerson.id;
      if (!existingPerson.userId) {
        // Should not happen post-Phase-1 backfill, but guard anyway.
        userId = randomUUID();
        await tx.insert(users).values({
          id: userId,
          email: d.email!,
          name: d.fullName,
          phone: d.usersPhone,
          role: d.systemRole,
          isActive: true,
        });
        await tx.update(people).set({ userId }).where(eq(people.id, personId));
      } else {
        userId = existingPerson.userId;
        // Update users row (email may stay same; phone may have changed)
        const usersUpdate: Record<string, unknown> = {
          name: d.fullName,
          role: d.systemRole,
          isActive: true,
          phone: d.usersPhone,
        };
        // Only update email if our calculated email differs from existing user email.
        // To avoid UNIQUE collisions, only set when not seen elsewhere.
        await tx.update(users).set(usersUpdate).where(eq(users.id, userId));
      }
      counters.associates.updated++;
    } else {
      // Need a fresh users row. Email already validated for uniqueness via emailSeen.
      userId = randomUUID();
      await tx.insert(users).values({
        id: userId,
        email: d.email!,
        name: d.fullName,
        phone: d.usersPhone,
        role: d.systemRole,
        isActive: true,
      });
      personId = randomUUID();
      counters.associates.created++;
      didCreate = true;
    }

    // Upsert auth_credentials (always rotate hash for fresh CSV)
    const [existingCred] = await tx
      .select({ id: authCredentials.id })
      .from(authCredentials)
      .where(eq(authCredentials.userId, userId))
      .limit(1);
    if (existingCred) {
      await tx
        .update(authCredentials)
        .set({
          passwordHash: d.passwordHash,
          passwordSetAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(authCredentials.id, existingCred.id));
    } else {
      await tx.insert(authCredentials).values({
        id: randomUUID(),
        userId,
        passwordHash: d.passwordHash,
      });
    }

    const peopleFields: Record<string, unknown> = {
      userId,
      employeeCode: d.employeeCode,
      fullName: d.fullName,
      primaryPhone: d.peoplePhone,
      email: d.email,
      staffType: "associate" as const,
      employmentType: d.employmentType,
      employmentStatus: "active" as const,
      designation: d.designation,
      homePropertyId: d.propertyId,
      joiningDate: d.joiningDate,
      dob: d.dob,
      aadhaarMasked: d.aadhaarLast4,
      emergencyContact: d.emergencyContact as any,
      currentSupervisorId: null, // resolved in pass 2
    };

    if (existingPerson) {
      await tx.update(people).set(peopleFields).where(eq(people.id, personId));
      info(`Phase D: updated people code=${d.employeeCode} as ${personId}`);
    } else {
      await tx.insert(people).values({ id: personId, ...peopleFields });
      info(`Phase D: created people code=${d.employeeCode} as ${personId}`);
    }

    // Idempotent assignment (personId, propertyId, roleCode=systemRole, active)
    const existingAssign = await tx
      .select({ id: assignments.id })
      .from(assignments)
      .where(
        and(
          eq(assignments.personId, personId),
          eq(assignments.propertyId, d.propertyId),
          eq(assignments.roleCode, d.systemRole),
          eq(assignments.status, "active"),
        ),
      )
      .limit(1);
    if (existingAssign.length === 0) {
      await tx.insert(assignments).values({
        id: randomUUID(),
        personId,
        propertyId: d.propertyId,
        roleCode: d.systemRole,
        startDate: d.joiningDate ?? new Date().toISOString().slice(0, 10),
        status: "active",
      });
      counters.assignments.created++;
      info(`Phase D: created assignment ${d.propertyDisplayName} ← code=${d.employeeCode} (${d.systemRole})`);
    }

    personByEmployeeCode.set(d.employeeCode, {
      personId,
      userId,
      systemRole: d.systemRole,
      propertyId: d.propertyId,
    });

    associateCsvRows.push([
      d.employeeCode,
      d.fullName,
      d.propertyDisplayName,
      d.designation,
      d.systemRole,
      d.password,
    ]);
  }

  // Pass 2: resolve currentSupervisorId.
  // For each property, find any associate with systemRole='supervisor' → their personId is the supervisor for that property.
  const supervisorByProperty = new Map<string, string>(); // propertyId → supervisor personId
  for (const [, entry] of personByEmployeeCode) {
    if (entry.systemRole === "supervisor" && !supervisorByProperty.has(entry.propertyId)) {
      supervisorByProperty.set(entry.propertyId, entry.personId);
    }
  }

  for (const [code, entry] of personByEmployeeCode) {
    const propSupervisor = supervisorByProperty.get(entry.propertyId);
    let supervisorId: string | null;
    if (propSupervisor && propSupervisor !== entry.personId) {
      supervisorId = propSupervisor;
    } else {
      // Fallback: Ajit's users.id. Self-reference avoided for supervisors at properties without another supervisor.
      supervisorId = ajitUserId;
    }
    if (supervisorId) {
      await tx
        .update(people)
        .set({ currentSupervisorId: supervisorId })
        .where(eq(people.id, entry.personId));
    } else {
      warn(`Phase D pass 2: code=${code} has no supervisor and no Ajit fallback available (currentSupervisorId left null)`);
    }
  }
}

// ─── Phase E: Bench geofence verification ───────────────────────────
async function verifyBenchGeofence(tx: any, propertyByKey: Map<string, PropertyRow>): Promise<void> {
  // We don't hardcode bench names — instead, verify any property with NULL lat or NULL lng has lenient=true.
  const all = await tx.select().from(properties);
  for (const p of all) {
    if (p.gpsLat === null || p.gpsLng === null) {
      if (!p.geofenceLenient) {
        await tx.update(properties).set({ geofenceLenient: true }).where(eq(properties.id, p.id));
        info(`Phase E: corrected geofenceLenient=true on '${p.name}' (was false despite NULL coords)`);
      } else {
        info(`Phase E: confirmed geofenceLenient=true on '${p.name}' (NULL coords)`);
      }
    }
  }
}

// ─── Phase F: Final summary ─────────────────────────────────────────
function writeSummary(): void {
  const summary = {
    properties: counters.properties,
    owners: counters.owners,
    staff: counters.staff,
    associates: counters.associates,
    assignments: counters.assignments,
    warnings,
    errors,
  };
  writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2));
  console.log("\n[seed] === SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
}

function writeCsvs(): void {
  writeFileSync(
    STAFF_CSV,
    csvLine(["email", "full_name", "role", "initial_password", "designation"]) +
      staffCsvRows.map(csvLine).join(""),
  );
  writeFileSync(
    ASSOC_CSV,
    csvLine(["employee_code", "full_name", "property", "designation", "system_role", "initial_pin"]) +
      associateCsvRows.map(csvLine).join(""),
  );
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(XLSX_PATH)) {
    console.error(`SEED ABORTED: spreadsheet not found at ${XLSX_PATH}`);
    process.exit(1);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const buf = readFileSync(XLSX_PATH);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false, raw: true });
  const propertyRows = readSheet(wb, "Properties");
  const ownerRows = readSheet(wb, "Owners");
  const associateRows = readSheet(wb, "Associates");
  const staffRows = readSheet(wb, "Staff");
  info(`loaded spreadsheet: properties=${propertyRows.length}, owners=${ownerRows.length}, associates=${associateRows.length}, staff=${staffRows.length}`);

  const db = await getDb();
  if (!db) {
    console.error("SEED ABORTED: DATABASE_URL is not configured or DB unavailable");
    process.exit(1);
  }

  // Shared deduplication maps populated across phases
  const phoneSeen = new Map<string, string>();
  const emailSeen = new Map<string, string>();

  try {
    await db.transaction(async (tx) => {
      const propertyByKey = await seedProperties(tx, propertyRows);
      const { ajitUserId } = await seedOwners(
        tx,
        ownerRows,
        propertyByKey,
        phoneSeen,
        emailSeen,
      );
      await seedStaff(tx, staffRows, propertyByKey, phoneSeen, emailSeen);
      await seedAssociates(tx, associateRows, propertyByKey, phoneSeen, emailSeen, ajitUserId);
      await verifyBenchGeofence(tx, propertyByKey);
    });
    writeCsvs();
    writeSummary();
    console.log(`\n[seed] DONE. Output in ${OUTPUT_DIR}`);
  } catch (e) {
    console.error("\n[seed] SEED ABORTED — transaction rolled back");
    console.error(e);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

main().catch((e) => {
  console.error("SEED ABORTED:", e);
  process.exit(1);
});
