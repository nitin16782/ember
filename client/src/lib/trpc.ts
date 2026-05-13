import { createTRPCReact, httpBatchLink, type CreateTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";
import superjson from "superjson";

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

// Token state held outside React so the httpBatchLink can always read
// the current token without re-creating the client. Updated by the
// AuthContext on every token issue / refresh / logout.
let currentAccessToken: string | null = null;
let onUnauthorized: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setUnauthorizedHandler(fn: () => Promise<string | null>) {
  onUnauthorized = fn;
}

const trpcUrl = import.meta.env.VITE_TRPC_URL ?? "/api/trpc";

/**
 * Custom fetch that:
 *  1. Adds Authorization: Bearer <token> if we have one
 *  2. On 401, asks the auth context to refresh and retries once
 */
const authedFetch: typeof fetch = async (input, init = {}) => {
  const buildHeaders = (token: string | null): HeadersInit => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  const firstAttempt = await fetch(input, { ...init, headers: buildHeaders(currentAccessToken) });

  if (firstAttempt.status !== 401 || !onUnauthorized) return firstAttempt;

  const newToken = await onUnauthorized();
  if (!newToken) return firstAttempt;

  return fetch(input, { ...init, headers: buildHeaders(newToken) });
};

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: trpcUrl,
      transformer: superjson,
      fetch: authedFetch,
    }),
  ],
});
