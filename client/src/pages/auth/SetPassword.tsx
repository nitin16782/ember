import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function SetPassword() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const setInitial = trpc.auth.setInitialPassword.useMutation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setSubmitting(true);
    try {
      await setInitial.mutateAsync({ newPassword: password });
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally { setSubmitting(false); }
  }

  return (
    <AuthLayout
      title="Set a password"
      subtitle={`Welcome, ${user?.name ?? user?.email ?? ""}. Set a password for future sign-ins.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" required autoFocus autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
          <p className="text-xs text-[#5C5C5C] mt-1">
            At least 10 characters, with a digit and a special character.
          </p>
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" required autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={submitting} />
        </div>
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
        <Button type="submit" disabled={submitting} className="w-full bg-[#1A3A5C] hover:bg-[#15304d]">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save and continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
