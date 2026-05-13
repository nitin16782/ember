import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Loader2 } from "lucide-react";

export default function MagicLinkConsume() {
  const [, setLocation] = useLocation();
  const { consumeMagicLink } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setError("This link is missing a token.");
      return;
    }
    consumeMagicLink(token)
      .then(() => setLocation("/"))
      .catch((err) => setError(err instanceof Error ? err.message : "Link is invalid or expired"));
  }, [consumeMagicLink, setLocation]);

  return (
    <AuthLayout title={error ? "Link issue" : "Signing you in"}>
      <div className="text-center py-8">
        {error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-[#1A3A5C] mx-auto" />
        )}
      </div>
    </AuthLayout>
  );
}
