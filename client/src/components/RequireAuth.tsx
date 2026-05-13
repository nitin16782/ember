import { type ReactNode } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth, type Role } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  /** If specified, only these roles can access the route */
  allowedRoles?: Role[];
  /** Where to redirect unauthenticated users */
  loginPath?: string;
}

export function RequireAuth({ children, allowedRoles, loginPath = "/login" }: Props) {
  const { user, status } = useAuth();
  const [location] = useLocation();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE]">
        <Loader2 className="h-6 w-6 animate-spin text-[#1A3A5C]" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    const dest = encodeURIComponent(location);
    return <Redirect to={`${loginPath}?from=${dest}`} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE] px-4">
        <div className="text-center max-w-md">
          <h2 className="font-['Georgia',serif] text-2xl text-[#1A3A5C] mb-2">Access restricted</h2>
          <p className="text-sm text-[#5C5C5C]">This area is not available for your role.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
