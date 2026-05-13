import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function StaffLogin() {
  const [, setLocation] = useLocation();
  const { loginWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      setLocation(from ? decodeURIComponent(from) : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="For Firebrick staff and operations"
      footer={
        <>
          <Link href="/login/magic" className="text-[#1A3A5C] hover:underline">Sign in with email link</Link>
          <span className="mx-2 text-[#D9D2C2]">·</span>
          <Link href="/login/associate" className="text-[#1A3A5C] hover:underline">I'm an associate</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email" type="email" required autoComplete="email" autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        <Button type="submit" disabled={submitting} className="w-full bg-[#1A3A5C] hover:bg-[#15304d]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
