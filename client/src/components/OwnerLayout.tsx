import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export function OwnerLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <header className="bg-white border-b border-[#D9D2C2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-3">
            <span className="text-xs tracking-[0.2em] text-[#7A5C0F] font-bold">FIREBRICK</span>
            <span className="text-sm text-[#5C5C5C] hidden sm:inline">Owner Portal</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#1A1A1A] hidden sm:inline">{user?.name ?? user?.email}</span>
            <button
              onClick={() => logout().then(() => setLocation("/login/owner"))}
              className="flex items-center gap-1.5 text-sm text-[#1A3A5C] hover:underline"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
