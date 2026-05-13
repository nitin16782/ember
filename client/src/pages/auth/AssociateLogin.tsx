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
  const { requestOtp, loginWithOtp } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      await requestOtp(phone);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally { setSubmitting(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      await loginWithOtp(phone, code);
      setLocation("/associate/attendance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code");
    } finally { setSubmitting(false); }
  }

  return (
    <AuthLayout
      title={step === "phone" ? "Associate sign in" : "Enter code"}
      subtitle={step === "phone" ? "We'll send a code to your phone" : `Sent to ${phone}`}
      footer={<Link href="/login" className="text-[#1A3A5C] hover:underline">Staff sign in</Link>}
    >
      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone" type="tel" required autoFocus inputMode="tel" autoComplete="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              disabled={submitting} placeholder="+91 98765 43210"
            />
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-[#1A3A5C] hover:bg-[#15304d]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <div>
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code" type="text" required autoFocus inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} pattern="\d{6}"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={submitting}
              className="text-center text-2xl tracking-[0.4em] font-['Consolas',monospace]"
            />
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <Button type="submit" disabled={submitting || code.length !== 6} className="w-full bg-[#1A3A5C] hover:bg-[#15304d]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(null); }}
            className="w-full text-sm text-[#1A3A5C] hover:underline"
          >
            Use a different number
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
