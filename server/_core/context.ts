import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export interface Context {
  user: User | null;
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
}

// Tests still import `TrpcContext`; alias retained for compatibility.
export type TrpcContext = Context;

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<Context> {
  // Auth resolution happens here in Prompt 3. For now, user is always null.
  return { user: null, req, res };
}
