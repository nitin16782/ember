import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useAssociateLocale } from "@/lib/i18n/associate";

export default function AssociateOtpLogin() {
  const [, setLocation] = useLocation();
  const { requestOtp, loginWithOtp } = useAuth();
  const { locale, setLocale, t } = useAssociateLocale();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strip non-digits + leading "91" prefix to validate the underlying
  // subscriber number. India: 10 digits. International: 8-15 digits.
  const phoneDigits = phone.replace(/\D/g, "");
  const subscriberDigits = phoneDigits.startsWith("91") ? phoneDigits.slice(2) : phoneDigits;
  const isPhoneValid = subscriberDigits.length === 10 || (phoneDigits.length >= 8 && phoneDigits.length <= 15);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPhoneValid) {
      setError(t.errorPhone);
      return;
    }
    setSubmitting(true);
    try {
      await requestOtp(phone);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorSendCode);
    } finally { setSubmitting(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      await loginWithOtp(phone, code);
      setLocation("/associate/attendance");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorOtpCode);
    } finally { setSubmitting(false); }
  }

  return (
    <AuthLayout
      title={step === "phone" ? t.loginTitle : t.enterCodeTitle}
      subtitle={step === "phone" ? t.loginSubtitleOtpPhone : t.loginSubtitleOtpCode(phone)}
      footer={
        <div className="flex flex-col gap-1 text-center">
          <Link href="/login/associate" className="text-[#1A3A5C] hover:underline">{t.switchToEmpCodeLink}</Link>
          <Link href="/login" className="text-[#1A3A5C] hover:underline">{t.staffSignInLink}</Link>
        </div>
      }
    >
      <LanguagePicker value={locale} onChange={setLocale} label={t.pickLanguage} />
      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-4" lang={locale}>
          <div>
            <Label htmlFor="phone">{t.phoneLabel}</Label>
            <Input
              id="phone" type="tel" required autoFocus inputMode="tel" autoComplete="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              disabled={submitting} placeholder={t.phonePlaceholder}
            />
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <Button type="submit" disabled={submitting || !isPhoneValid} className="w-full bg-[#1A3A5C] hover:bg-[#15304d]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.sendCodeButton}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4" lang={locale}>
          <div>
            <Label htmlFor="code">{t.codeLabel}</Label>
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.signInButton}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(null); }}
            className="w-full text-sm text-[#1A3A5C] hover:underline"
          >
            {t.useDifferentNumberLink}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
