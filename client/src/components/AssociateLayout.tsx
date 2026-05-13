import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export function AssociateLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#F7F3EE] portrait-only">
      <header className="bg-white border-b border-[#D9D2C2] sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-[0.2em] text-[#7A5C0F] font-bold">FIREBRICK</span>
          </div>
          <button
            onClick={() => logout().then(() => setLocation("/login/associate"))}
            className="flex items-center gap-1.5 text-sm text-[#1A3A5C] min-h-[44px] min-w-[44px] justify-center"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xs:inline">Sign out</span>
          </button>
        </div>
        {user?.name ? (
          <div className="px-4 pb-2 max-w-md mx-auto text-xs text-[#5C5C5C]">
            Signed in as {user.name}
          </div>
        ) : null}
      </header>
      <main className="max-w-md mx-auto px-4 py-4 pb-24">{children}</main>
    </div>
  );
}
