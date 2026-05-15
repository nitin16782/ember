import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Globe, Check } from "lucide-react";
import { LOCALES, useAssociateLocale, type Locale } from "@/lib/i18n/associate";

export function AssociateLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { locale, setLocale, t } = useAssociateLocale();

  return (
    <div className="min-h-screen bg-[#F7F3EE] portrait-only" lang={locale}>
      <header className="bg-white border-b border-[#D9D2C2] sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-[0.2em] text-[#7A5C0F] font-bold">FIREBRICK</span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleMenu locale={locale} onChange={setLocale} label={t.pickLanguage} />
            <button
              onClick={() => logout().then(() => setLocation("/login/associate"))}
              className="flex items-center gap-1.5 text-sm text-[#1A3A5C] min-h-[44px] min-w-[44px] justify-center"
              aria-label={t.signOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xs:inline">{t.signOut}</span>
            </button>
          </div>
        </div>
        {user?.name ? (
          <div className="px-4 pb-2 max-w-md mx-auto text-xs text-[#5C5C5C]">
            {t.signedInAs(user.name)}
          </div>
        ) : null}
      </header>
      <main className="max-w-md mx-auto px-4 py-4 pb-24">{children}</main>
    </div>
  );
}

/** Compact globe-icon dropdown — opens a small menu listing the 6 locales. */
function LocaleMenu({
  locale,
  onChange,
  label,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-[#1A3A5C] min-h-[44px] px-2 rounded hover:bg-[#F7F3EE]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
      >
        <Globe className="h-4 w-4" />
        <span lang={active.code} className="hidden sm:inline">{active.nativeName}</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full mt-1 min-w-[160px] bg-white border border-[#D9D2C2] rounded-md shadow-md py-1 z-20"
        >
          {LOCALES.map((l) => {
            const isActive = l.code === locale;
            return (
              <button
                key={l.code}
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => { onChange(l.code); setOpen(false); }}
                lang={l.code}
                className={
                  "w-full text-left px-3 py-2 text-sm flex items-center justify-between " +
                  (isActive ? "bg-[#F7F3EE] text-[#1A3A5C] font-medium" : "text-[#1A1A1A] hover:bg-[#F7F3EE]")
                }
              >
                <span>{l.nativeName}</span>
                {isActive ? <Check className="h-3.5 w-3.5 text-[#1A3A5C]" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
