import { LOCALES, type Locale } from "@/lib/i18n/associateLogin";

export interface LanguagePickerProps {
  value: Locale;
  onChange: (next: Locale) => void;
  label: string;
}

/**
 * Horizontal pill row for picking a language on the associate login pages.
 * Each pill shows the language's name in its own script so users don't need
 * to read English to find their language.
 */
export function LanguagePicker({ value, onChange, label }: LanguagePickerProps) {
  return (
    <div className="mb-6">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#5C5C5C] text-center mb-2">
        {label}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-1.5 justify-center"
      >
        {LOCALES.map((l) => {
          const active = l.code === value;
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={l.ariaLabel}
              lang={l.code}
              onClick={() => onChange(l.code)}
              className={
                "px-3 py-1 rounded-full text-sm border transition-colors " +
                (active
                  ? "bg-[#1A3A5C] border-[#1A3A5C] text-white"
                  : "bg-white border-[#D9D2C2] text-[#1A3A5C] hover:border-[#1A3A5C]/40")
              }
            >
              {l.nativeName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
