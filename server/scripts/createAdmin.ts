import "dotenv/config";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "../db";
import { users, authCredentials } from "../../drizzle/schema";
import { hashPassword } from "../services/auth";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] ?? "Super Admin";

  if (!email || !password) {
    console.error("Usage: pnpm tsx server/scripts/createAdmin.ts <email> <password> [name]");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("DB unavailable; set DATABASE_URL");
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) {
    console.error(`User already exists with email ${normalizedEmail} (id=${existing.id})`);
    await closeDb();
    process.exit(1);
  }

  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    email: normalizedEmail,
    name,
    role: "super_admin",
    isActive: true,
  });

  const passwordHash = await hashPassword(password);
  await db.insert(authCredentials).values({
    id: randomUUID(),
    userId,
    passwordHash,
  });

  console.log(`Created super_admin: ${normalizedEmail} (id=${userId})`);
  await closeDb();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
