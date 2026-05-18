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

export default function AssociateLogin() {
  const [, setLocation] = useLocation();
  const { loginWithEmployeeCode } = useAuth();
  const { locale, setLocale, t } = useAssociateLocale();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accept "42", "EMP-42", "emp 42" — normalise on submit. The server
  // upper-cases and trims too, but doing it here lets the disabled-
  // submit gate behave intuitively.
  //
  // Two coexisting code conventions:
  //   - legacy: short numeric (≤4 digits) auto-padded into `EMP-NNNN`
  //   - pilot/onwards: long bare digit IDs from id_card_number (up to
  //     16 chars to match the people.employeeCode column width)
  const normalizedCode = code.trim().toUpperCase();
  const codeOk = /^EMP-\d{1,12}$/.test(normalizedCode) || /^\d{1,16}$/.test(normalizedCode);
  const pinOk = /^\d{6}$/.test(pin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!codeOk) { setError(t.errorEmployeeId); return; }
    if (!pinOk) { setError(t.errorPin); return; }

    setSubmitting(true);
    try {
      // Pass long bare digit IDs through as-is (pilot natural keys like
      // `125260020`). Only zero-pad short legacy numeric input into the
      // `EMP-NNNN` form so existing legacy users still work.
      let finalCode: string;
      if (normalizedCode.startsWith("EMP-")) {
        finalCode = normalizedCode;
      } else if (normalizedCode.length <= 4) {
        finalCode = `EMP-${normalizedCode.padStart(4, "0")}`;
      } else {
        finalCode = normalizedCode;
      }
      const { mustChangePin } = await loginWithEmployeeCode(finalCode, pin);
      if (mustChangePin) {
        setLocation("/auth/change-pin");
      } else {
        setLocation("/associate/attendance");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    } finally { setSubmitting(false); }
  }

  return (
    <AuthLayout
      title={t.loginTitle}
      subtitle={t.loginSubtitleEmpCode}
      footer={
        <Link href="/login" className="text-[#1A3A5C] hover:underline">{t.staffSignInLink}</Link>
      }
    >
      <LanguagePicker value={locale} onChange={setLocale} label={t.pickLanguage} />
      <form onSubmit={submit} className="space-y-4" lang={locale}>
        <div>
          <Label htmlFor="employeeCode">{t.employeeIdLabel}</Label>
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
            placeholder={t.employeeIdPlaceholder}
            className="text-lg"
          />
        </div>
        <div>
          <Label htmlFor="pin">{t.pinLabel}</Label>
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.signInButton}
        </Button>
      </form>
    </AuthLayout>
  );
}
