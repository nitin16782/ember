import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function OwnerLogin() {
  const [, setLocation] = useLocation();
  const { requestOtp, loginWithOtp, requestMagicLink } = useAuth();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"identifier" | "code" | "linkSent">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onIdentifierSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      if (method === "phone") {
        await requestOtp(identifier);
        setStep("code");
      } else {
        await requestMagicLink(identifier);
        setStep("linkSent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally { setSubmitting(false); }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      await loginWithOtp(identifier, code);
      setLocation("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code");
    } finally { setSubmitting(false); }
  }

  if (step === "linkSent") {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={`If an owner account exists for ${identifier}, a sign-in link is on its way.`}
      >
        <div className="text-center py-4">
          <button onClick={() => { setStep("identifier"); setMethod("phone"); }} className="text-sm text-[#1A3A5C] hover:underline">
            Use phone number instead
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Owner sign in"
      subtitle={step === "identifier" ? "We'll send a one-time code" : `Code sent to ${identifier}`}
    >
      {step === "identifier" ? (
        <form onSubmit={onIdentifierSubmit} className="space-y-4">
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setMethod("phone")}
              className={`flex-1 py-2 text-sm rounded ${method === "phone"
                ? "bg-[#1A3A5C] text-white"
                : "bg-white border border-[#D9D2C2] text-[#1A1A1A]"}`}>
              Phone
            </button>
            <button type="button" onClick={() => setMethod("email")}
              className={`flex-1 py-2 text-sm rounded ${method === "email"
                ? "bg-[#1A3A5C] text-white"
                : "bg-white border border-[#D9D2C2] text-[#1A1A1A]"}`}>
              Email
            </button>
          </div>
          <div>
            <Label htmlFor="identifier">{method === "phone" ? "Phone number" : "Email"}</Label>
            <Input
              id="identifier" required autoFocus
              type={method === "phone" ? "tel" : "email"}
              inputMode={method === "phone" ? "tel" : "email"}
              value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              disabled={submitting}
              placeholder={method === "phone" ? "+91 98765 43210" : "you@example.com"}
            />
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-[#1A3A5C] hover:bg-[#15304d]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : method === "phone" ? "Send code" : "Email me a link"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="space-y-4">
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
          <button type="button" onClick={() => { setStep("identifier"); setCode(""); setError(null); }}
            className="w-full text-sm text-[#1A3A5C] hover:underline">
            Use a different number or email
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
