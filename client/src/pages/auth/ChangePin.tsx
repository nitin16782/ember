import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useAssociateLocale } from "@/lib/i18n/associate";

export default function ChangePin() {
  const [, setLocation] = useLocation();
  const { user, changeAssociatePin } = useAuth();
  const { locale, setLocale, t } = useAssociateLocale();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNewValid = /^\d{6}$/.test(newPin);
  const matches = newPin === confirmPin && confirmPin.length > 0;
  const different = newPin !== currentPin;
  const canSubmit = currentPin.length === 6 && isNewValid && matches && different;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isNewValid) { setError(t.changePinErrorNewLength); return; }
    if (!matches) { setError(t.changePinErrorMismatch); return; }
    if (!different) { setError(t.changePinErrorSame); return; }

    setSubmitting(true);
    try {
      await changeAssociatePin(currentPin, newPin);
      setLocation(user?.role === "associate" ? "/associate/attendance" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.changePinErrorGeneric);
    } finally { setSubmitting(false); }
  }

  return (
    <AuthLayout title={t.changePinTitle} subtitle={t.changePinSubtitle}>
      <LanguagePicker value={locale} onChange={setLocale} label={t.pickLanguage} />
      <form onSubmit={onSubmit} className="space-y-4" lang={locale}>
        <PinField id="currentPin" label={t.changePinCurrentLabel} value={currentPin} onChange={setCurrentPin} disabled={submitting} autoFocus />
        <PinField id="newPin" label={t.changePinNewLabel} value={newPin} onChange={setNewPin} disabled={submitting} />
        <PinField id="confirmPin" label={t.changePinConfirmLabel} value={confirmPin} onChange={setConfirmPin} disabled={submitting} />
        <p className="text-xs text-[#5C5C5C]">{t.changePinHint}</p>
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
        <Button type="submit" disabled={submitting || !canSubmit} className="w-full bg-[#1A3A5C] hover:bg-[#15304d] h-11">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.changePinSubmit}
        </Button>
      </form>
    </AuthLayout>
  );
}

function PinField({
  id, label, value, onChange, disabled, autoFocus,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; disabled: boolean; autoFocus?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        maxLength={6}
        pattern="\d{6}"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder="••••••"
        className="text-center text-2xl tracking-[0.4em] font-['Consolas',monospace]"
      />
    </div>
  );
}
