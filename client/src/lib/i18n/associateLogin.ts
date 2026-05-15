// Tiny i18n module for the associate login pages.
//
// Deliberately not pulling in i18next or react-intl — this is < 20 strings
// across two pages. Plain objects + a tiny hook = ~80 lines.
//
// Scope is **associate login only** for now. Translations should be eyeballed
// by a native speaker before pilot — they're functional but may benefit from
// formality / register adjustments. Strings flagged with REVIEW comments
// have known nuance.

import { useEffect, useState } from "react";

export type Locale = "en" | "hi" | "mr" | "bn" | "ta" | "te";

export const LOCALES: { code: Locale; nativeName: string; ariaLabel: string }[] = [
  { code: "en", nativeName: "English", ariaLabel: "English" },
  { code: "hi", nativeName: "हिन्दी", ariaLabel: "Hindi" },
  { code: "mr", nativeName: "मराठी", ariaLabel: "Marathi" },
  { code: "bn", nativeName: "বাংলা", ariaLabel: "Bengali" },
  { code: "ta", nativeName: "தமிழ்", ariaLabel: "Tamil" },
  { code: "te", nativeName: "తెలుగు", ariaLabel: "Telugu" },
];

export interface LoginStrings {
  // Pickers / chrome
  pickLanguage: string;

  // Common to both flows
  title: string;
  signInButton: string;
  signingIn: string;
  errorGeneric: string;

  // Employee-ID + PIN flow
  subtitleEmpCode: string;
  employeeIdLabel: string;
  employeeIdPlaceholder: string;
  pinLabel: string;
  errorEmployeeId: string;
  errorPin: string;
  staffSignInLink: string;
  switchToOtpLink: string;

  // OTP flow
  subtitleOtpPhone: string;
  subtitleOtpCode: (phone: string) => string;
  phoneLabel: string;
  phonePlaceholder: string;
  sendCodeButton: string;
  sendingCode: string;
  errorPhone: string;
  errorSendCode: string;
  codeLabel: string;
  errorOtpCode: string;
  useDifferentNumberLink: string;
  switchToEmpCodeLink: string;
  enterCodeTitle: string;
}

// English is the source. Other locales fall back to this for missing keys.
const en: LoginStrings = {
  pickLanguage: "Language",
  title: "Associate sign in",
  signInButton: "Sign in",
  signingIn: "Signing in",
  errorGeneric: "Could not sign in",

  subtitleEmpCode: "Enter your employee ID and PIN",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "Enter your employee ID (e.g. EMP-0042).",
  errorPin: "PIN must be 6 digits.",
  staffSignInLink: "Staff sign in",
  switchToOtpLink: "Sign in with phone OTP instead",

  subtitleOtpPhone: "We'll send a code to your phone",
  subtitleOtpCode: (phone: string) => `Sent to ${phone}`,
  phoneLabel: "Phone number",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "Send code",
  sendingCode: "Sending",
  errorPhone: "Enter a 10-digit Indian mobile number (e.g. 9876543210 or +91 98765 43210).",
  errorSendCode: "Could not send code",
  codeLabel: "6-digit code",
  errorOtpCode: "Incorrect code",
  useDifferentNumberLink: "Use a different number",
  switchToEmpCodeLink: "Use employee ID + PIN instead",
  enterCodeTitle: "Enter code",
};

// REVIEW: All translations below should be reviewed by a native speaker
// before pilot rollout. "Employee ID" and "PIN" are sometimes left in
// English in Indian workplace contexts — kept English here.

const hi: LoginStrings = {
  pickLanguage: "भाषा",
  title: "साथी साइन-इन",
  signInButton: "साइन इन",
  signingIn: "साइन इन हो रहा है",
  errorGeneric: "साइन इन नहीं हो सका",

  subtitleEmpCode: "अपना Employee ID और PIN दर्ज करें",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "अपना Employee ID दर्ज करें (उदा. EMP-0042)।",
  errorPin: "PIN 6 अंकों का होना चाहिए।",
  staffSignInLink: "स्टाफ साइन-इन",
  switchToOtpLink: "फोन OTP से साइन इन करें",

  subtitleOtpPhone: "हम आपके फोन पर कोड भेजेंगे",
  subtitleOtpCode: (phone: string) => `${phone} पर भेजा गया`,
  phoneLabel: "फोन नंबर",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "कोड भेजें",
  sendingCode: "भेज रहे हैं",
  errorPhone: "10 अंकों का भारतीय मोबाइल नंबर दर्ज करें (उदा. 9876543210 या +91 98765 43210)।",
  errorSendCode: "कोड नहीं भेजा जा सका",
  codeLabel: "6-अंकीय कोड",
  errorOtpCode: "गलत कोड",
  useDifferentNumberLink: "अलग नंबर का उपयोग करें",
  switchToEmpCodeLink: "Employee ID + PIN से साइन इन करें",
  enterCodeTitle: "कोड दर्ज करें",
};

const mr: LoginStrings = {
  pickLanguage: "भाषा",
  title: "सहकारी साइन-इन",
  signInButton: "साइन इन",
  signingIn: "साइन इन होत आहे",
  errorGeneric: "साइन इन होऊ शकले नाही",

  subtitleEmpCode: "तुमचा Employee ID आणि PIN टाका",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "तुमचा Employee ID टाका (उदा. EMP-0042).",
  errorPin: "PIN 6 अंकी असला पाहिजे.",
  staffSignInLink: "स्टाफ साइन-इन",
  switchToOtpLink: "फोन OTP ने साइन इन करा",

  subtitleOtpPhone: "आम्ही तुमच्या फोनवर कोड पाठवू",
  subtitleOtpCode: (phone: string) => `${phone} वर पाठवले`,
  phoneLabel: "फोन नंबर",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "कोड पाठवा",
  sendingCode: "पाठवत आहे",
  errorPhone: "10 अंकी भारतीय मोबाइल नंबर टाका (उदा. 9876543210 किंवा +91 98765 43210).",
  errorSendCode: "कोड पाठवता आला नाही",
  codeLabel: "6-अंकी कोड",
  errorOtpCode: "चुकीचा कोड",
  useDifferentNumberLink: "वेगळा नंबर वापरा",
  switchToEmpCodeLink: "Employee ID + PIN ने साइन इन करा",
  enterCodeTitle: "कोड टाका",
};

const bn: LoginStrings = {
  pickLanguage: "ভাষা",
  title: "সহকারী সাইন-ইন",
  signInButton: "সাইন ইন",
  signingIn: "সাইন ইন হচ্ছে",
  errorGeneric: "সাইন ইন করা যায়নি",

  subtitleEmpCode: "আপনার Employee ID এবং PIN দিন",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "আপনার Employee ID দিন (যেমন EMP-0042)।",
  errorPin: "PIN অবশ্যই 6 সংখ্যার হতে হবে।",
  staffSignInLink: "স্টাফ সাইন-ইন",
  switchToOtpLink: "ফোন OTP দিয়ে সাইন ইন করুন",

  subtitleOtpPhone: "আমরা আপনার ফোনে একটি কোড পাঠাব",
  subtitleOtpCode: (phone: string) => `${phone} এ পাঠানো হয়েছে`,
  phoneLabel: "ফোন নম্বর",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "কোড পাঠান",
  sendingCode: "পাঠানো হচ্ছে",
  errorPhone: "একটি 10-সংখ্যার ভারতীয় মোবাইল নম্বর দিন (যেমন 9876543210 বা +91 98765 43210)।",
  errorSendCode: "কোড পাঠানো যায়নি",
  codeLabel: "6-সংখ্যার কোড",
  errorOtpCode: "ভুল কোড",
  useDifferentNumberLink: "অন্য নম্বর ব্যবহার করুন",
  switchToEmpCodeLink: "Employee ID + PIN দিয়ে সাইন ইন করুন",
  enterCodeTitle: "কোড দিন",
};

const ta: LoginStrings = {
  pickLanguage: "மொழி",
  title: "உதவியாளர் உள்நுழைவு",
  signInButton: "உள்நுழை",
  signingIn: "உள்நுழைகிறது",
  errorGeneric: "உள்நுழைய முடியவில்லை",

  subtitleEmpCode: "உங்கள் Employee ID மற்றும் PIN ஐ உள்ளிடவும்",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "உங்கள் Employee ID ஐ உள்ளிடவும் (எ.கா. EMP-0042).",
  errorPin: "PIN 6 இலக்கங்களாக இருக்க வேண்டும்.",
  staffSignInLink: "ஊழியர் உள்நுழைவு",
  switchToOtpLink: "தொலைபேசி OTP மூலம் உள்நுழைக",

  subtitleOtpPhone: "உங்கள் தொலைபேசிக்கு குறியீட்டை அனுப்புவோம்",
  subtitleOtpCode: (phone: string) => `${phone} க்கு அனுப்பப்பட்டது`,
  phoneLabel: "தொலைபேசி எண்",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "குறியீட்டை அனுப்பு",
  sendingCode: "அனுப்புகிறது",
  errorPhone: "10-இலக்க இந்திய மொபைல் எண்ணை உள்ளிடவும் (எ.கா. 9876543210 அல்லது +91 98765 43210).",
  errorSendCode: "குறியீட்டை அனுப்ப முடியவில்லை",
  codeLabel: "6-இலக்க குறியீடு",
  errorOtpCode: "தவறான குறியீடு",
  useDifferentNumberLink: "வேறு எண்ணைப் பயன்படுத்து",
  switchToEmpCodeLink: "Employee ID + PIN மூலம் உள்நுழைக",
  enterCodeTitle: "குறியீட்டை உள்ளிடவும்",
};

const te: LoginStrings = {
  pickLanguage: "భాష",
  title: "సహాయక సైన్-ఇన్",
  signInButton: "సైన్ ఇన్",
  signingIn: "సైన్ ఇన్ అవుతోంది",
  errorGeneric: "సైన్ ఇన్ చేయలేకపోయాం",

  subtitleEmpCode: "మీ Employee ID మరియు PIN నమోదు చేయండి",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "మీ Employee ID నమోదు చేయండి (ఉదా. EMP-0042).",
  errorPin: "PIN తప్పనిసరిగా 6 అంకెలు ఉండాలి.",
  staffSignInLink: "సిబ్బంది సైన్-ఇన్",
  switchToOtpLink: "ఫోన్ OTP తో సైన్ ఇన్ చేయండి",

  subtitleOtpPhone: "మేము మీ ఫోన్‌కు కోడ్ పంపుతాము",
  subtitleOtpCode: (phone: string) => `${phone} కు పంపబడింది`,
  phoneLabel: "ఫోన్ నంబర్",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "కోడ్ పంపండి",
  sendingCode: "పంపుతోంది",
  errorPhone: "10-అంకెల భారతీయ మొబైల్ నంబర్ నమోదు చేయండి (ఉదా. 9876543210 లేదా +91 98765 43210).",
  errorSendCode: "కోడ్ పంపలేకపోయాం",
  codeLabel: "6-అంకెల కోడ్",
  errorOtpCode: "తప్పు కోడ్",
  useDifferentNumberLink: "వేరే నంబర్ ఉపయోగించండి",
  switchToEmpCodeLink: "Employee ID + PIN తో సైన్ ఇన్ చేయండి",
  enterCodeTitle: "కోడ్ నమోదు చేయండి",
};

const DICTIONARIES: Record<Locale, LoginStrings> = { en, hi, mr, bn, ta, te };

const STORAGE_KEY = "ember.locale.associate";

function readStoredLocale(): Locale {
  if (typeof globalThis === "undefined" || typeof (globalThis as any).localStorage === "undefined") {
    return "en";
  }
  try {
    const stored = (globalThis as any).localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DICTIONARIES) return stored as Locale;
  } catch {
    // private mode / storage unavailable — fall through
  }
  return "en";
}

function writeStoredLocale(locale: Locale): void {
  if (typeof globalThis === "undefined" || typeof (globalThis as any).localStorage === "undefined") return;
  try {
    (globalThis as any).localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // private mode / quota exceeded — silently ignore
  }
}

export function useLoginLocale(): {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: LoginStrings;
} {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  useEffect(() => {
    writeStoredLocale(locale);
    // Hint to screen readers / fonts via the document language.
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return {
    locale,
    setLocale: setLocaleState,
    t: DICTIONARIES[locale] ?? en,
  };
}
