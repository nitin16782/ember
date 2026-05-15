import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { setAccessToken, getAccessToken, setUnauthorizedHandler } from "@/lib/trpc";

// ─── Types ──────────────────────────────────────────────────────────

export type Role =
  | "super_admin" | "central_admin" | "ops_lead" | "supply_lead"
  | "finance_admin" | "property_manager" | "supervisor"
  | "associate" | "owner_portal";

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  role: Role;
  permissionOverrides: Record<string, unknown> | null;
  lastSignedInAt: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

interface AuthContextValue extends AuthState {
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithOtp: (identifier: string, code: string) => Promise<void>;
  loginWithEmployeeCode: (code: string, pin: string) => Promise<{ mustChangePin: boolean }>;
  changeAssociatePin: (currentPin: string, newPin: string) => Promise<void>;
  requestOtp: (identifier: string) => Promise<{ expiresInMin: number }>;
  requestMagicLink: (email: string) => Promise<{ expiresInMin: number }>;
  consumeMagicLink: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Storage helpers ────────────────────────────────────────────────

const STORAGE_KEY_REFRESH = "ember.refreshToken";

function saveRefreshToken(token: string) {
  try { sessionStorage.setItem(STORAGE_KEY_REFRESH, token); } catch { /* SSR/private mode */ }
}
function loadRefreshToken(): string | null {
  try { return sessionStorage.getItem(STORAGE_KEY_REFRESH); } catch { return null; }
}
function clearRefreshToken() {
  try { sessionStorage.removeItem(STORAGE_KEY_REFRESH); } catch { /* */ }
}

// ─── Direct fetch (bypasses tRPC client to avoid recursive 401 loop) ─

async function rawTrpcCall<T = unknown>(
  procedure: string,
  input: unknown,
  accessToken?: string | null
): Promise<T> {
  const url = (import.meta.env.VITE_TRPC_URL ?? "/api/trpc") + "/" + procedure;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body?.error) {
    const msg = body?.error?.message ?? body?.error?.json?.message ?? `Request failed: ${resp.status}`;
    throw new Error(msg);
  }
  return (body?.result?.data?.json ?? body?.result?.data) as T;
}

// ─── Provider ───────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: "loading" });

  const refresh = useCallback(async (): Promise<boolean> => {
    const refreshToken = loadRefreshToken();
    if (!refreshToken) {
      setState({ user: null, status: "unauthenticated" });
      return false;
    }
    try {
      const data = await rawTrpcCall<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
      }>("auth.refresh", { refreshToken });
      setAccessToken(data.accessToken);
      saveRefreshToken(data.refreshToken);
      setState({ user: data.user, status: "authenticated" });
      return true;
    } catch {
      setAccessToken(null);
      clearRefreshToken();
      setState({ user: null, status: "unauthenticated" });
      return false;
    }
  }, []);

  // On mount: attempt to restore session
  useEffect(() => { refresh(); }, [refresh]);

  // Wire 401 handler into the tRPC client
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      const ok = await refresh();
      return ok ? getAccessToken() : null;
    });
  }, [refresh]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const data = await rawTrpcCall<{
      user: AuthUser; accessToken: string; refreshToken: string; expiresAt: string;
    }>("auth.login", { email, password });
    setAccessToken(data.accessToken);
    saveRefreshToken(data.refreshToken);
    setState({ user: data.user, status: "authenticated" });
  }, []);

  const requestOtp = useCallback(async (identifier: string) => {
    return await rawTrpcCall<{ ok: boolean; expiresInMin: number }>(
      "auth.requestOtp", { identifier, purpose: "login" }
    );
  }, []);

  const loginWithOtp = useCallback(async (identifier: string, code: string) => {
    const data = await rawTrpcCall<{
      user: AuthUser; accessToken: string; refreshToken: string; expiresAt: string;
    }>("auth.verifyOtp", { identifier, code });
    setAccessToken(data.accessToken);
    saveRefreshToken(data.refreshToken);
    setState({ user: data.user, status: "authenticated" });
  }, []);

  const loginWithEmployeeCode = useCallback(async (code: string, pin: string) => {
    const data = await rawTrpcCall<{
      user: AuthUser; accessToken: string; refreshToken: string; expiresAt: string; mustChangePin: boolean;
    }>("auth.loginWithEmployeeCode", { code, pin });
    setAccessToken(data.accessToken);
    saveRefreshToken(data.refreshToken);
    setState({ user: data.user, status: "authenticated" });
    return { mustChangePin: data.mustChangePin };
  }, []);

  const changeAssociatePin = useCallback(async (currentPin: string, newPin: string) => {
    const data = await rawTrpcCall<{
      accessToken: string; refreshToken: string;
    }>("auth.changeAssociatePin", { currentPin, newPin }, getAccessToken());
    setAccessToken(data.accessToken);
    saveRefreshToken(data.refreshToken);
  }, []);

  const requestMagicLink = useCallback(async (email: string) => {
    return await rawTrpcCall<{ ok: boolean; expiresInMin: number }>(
      "auth.requestMagicLink", { email }
    );
  }, []);

  const consumeMagicLink = useCallback(async (token: string) => {
    const data = await rawTrpcCall<{
      user: AuthUser; accessToken: string; refreshToken: string; expiresAt: string;
    }>("auth.consumeMagicLink", { token });
    setAccessToken(data.accessToken);
    saveRefreshToken(data.refreshToken);
    setState({ user: data.user, status: "authenticated" });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = loadRefreshToken();
    if (refreshToken) {
      try { await rawTrpcCall("auth.logout", { refreshToken }); } catch { /* swallow */ }
    }
    setAccessToken(null);
    clearRefreshToken();
    setState({ user: null, status: "unauthenticated" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        loginWithPassword, loginWithOtp, loginWithEmployeeCode,
        changeAssociatePin, requestOtp,
        requestMagicLink, consumeMagicLink,
        logout, refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
