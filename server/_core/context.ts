import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { eq } from "drizzle-orm";
import { verifyAccessToken } from "../services/auth";
import { getDb } from "../db";
import { users, type User } from "../../drizzle/schema";

export interface Context {
  user: User | null;
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
}

// Tests still import `TrpcContext`; alias retained for compatibility.
export type TrpcContext = Context;

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<Context> {
  let user: User | null = null;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const claims = await verifyAccessToken(token);
    if (claims?.sub) {
      const db = await getDb();
      if (db) {
        const [u] = await db.select().from(users)
          .where(eq(users.id, claims.sub)).limit(1);
        if (u?.isActive) user = u;
      }
    }
  }

  return { user, req, res };
}
