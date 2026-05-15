import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function AssociateLogin() {
  const [, setLocation] = useLocation();
  const { loginWithEmployeeCode } = useAuth();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accept "42", "EMP-42", "emp 42" — normalise on submit. The server
  // upper-cases and trims too, but doing it here lets the disabled-
  // submit gate behave intuitively.
  const normalizedCode = code.trim().toUpperCase();
  const codeOk = /^EMP-\d{1,8}$/.test(normalizedCode) || /^\d{1,8}$/.test(normalizedCode);
  const pinOk = /^\d{6}$/.test(pin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!codeOk) { setError("Enter your employee ID (e.g. EMP-0042)."); return; }
    if (!pinOk) { setError("PIN must be 6 digits."); return; }

    setSubmitting(true);
    try {
      const finalCode = normalizedCode.startsWith("EMP-")
        ? normalizedCode
        : `EMP-${normalizedCode.padStart(4, "0")}`;
      const { mustChangePin } = await loginWithEmployeeCode(finalCode, pin);
      if (mustChangePin) {
        setLocation("/auth/change-pin");
      } else {
        setLocation("/associate/attendance");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally { setSubmitting(false); }
  }

  return (
    <AuthLayout
      title="Associate sign in"
      subtitle="Enter your employee ID and PIN"
      footer={
        <Link href="/login" className="text-[#1A3A5C] hover:underline">Staff sign in</Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="employeeCode">Employee ID</Label>
          <Input
            id="employeeCode"
            type="text"
            required
            autoFocus
            autoCapitalize="characters"
            autoComplete="username"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={submitting}
            placeholder="EMP-0042"
            className="text-lg"
          />
        </div>
        <div>
          <Label htmlFor="pin">PIN</Label>
          <Input
            id="pin"
            type="password"
            required
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            pattern="\d{6}"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            disabled={submitting}
            placeholder="••••••"
            className="text-center text-2xl tracking-[0.4em] font-['Consolas',monospace]"
          />
        </div>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}
        <Button type="submit" disabled={submitting || !codeOk || !pinOk} className="w-full bg-[#1A3A5C] hover:bg-[#15304d] h-11">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
