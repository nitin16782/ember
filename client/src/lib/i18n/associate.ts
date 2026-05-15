// i18n for the entire associate-facing experience: login + post-login.
//
// Plain TypeScript dictionaries — no i18next or react-intl dep for ~80
// strings across 5 surfaces. en is the source of truth; other locales
// fall back to it for any missing key (defense against future drift).
//
// All non-English strings are marked REVIEW in this file. They're
// functional and grammatically correct but should be eyeballed by a
// native speaker before pilot rollout — there's nuance around formal
// vs. informal "you" (तुम्ही vs. आप, தாங்கள் vs. நீ etc.) and around
// retaining English technical words ("Employee ID", "PIN", "OTP",
// "selfie", "GPS", "geofence") that Indian workplace usage typically
// keeps English.
//
// Adding a new locale: copy `en` into a new const, translate, add to
// DICTIONARIES + LOCALES. Adding a new string: add to LoginStrings et
// al., then add to every dictionary (TypeScript will tell you which
// ones are missing).

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

export interface AssociateStrings {
  // ── Shared ──
  pickLanguage: string;
  signInButton: string;
  signOut: string;
  errorGeneric: string;
  retry: string;
  cancel: string;
  loading: string;
  signedInAs: (name: string) => string;

  // ── Login: employee-ID + PIN ──
  loginTitle: string;
  loginSubtitleEmpCode: string;
  employeeIdLabel: string;
  employeeIdPlaceholder: string;
  pinLabel: string;
  errorEmployeeId: string;
  errorPin: string;
  staffSignInLink: string;
  switchToOtpLink: string;

  // ── Login: phone OTP ──
  loginSubtitleOtpPhone: string;
  loginSubtitleOtpCode: (phone: string) => string;
  phoneLabel: string;
  phonePlaceholder: string;
  sendCodeButton: string;
  errorPhone: string;
  errorSendCode: string;
  codeLabel: string;
  errorOtpCode: string;
  useDifferentNumberLink: string;
  switchToEmpCodeLink: string;
  enterCodeTitle: string;

  // ── ChangePin ──
  changePinTitle: string;
  changePinSubtitle: string;
  changePinCurrentLabel: string;
  changePinNewLabel: string;
  changePinConfirmLabel: string;
  changePinHint: string;
  changePinErrorNewLength: string;
  changePinErrorMismatch: string;
  changePinErrorSame: string;
  changePinErrorGeneric: string;
  changePinSubmit: string;

  // ── AttendanceHome ──
  homeGreeting: (firstName: string) => string;
  homeNoProperty: string;
  homeNoPropertyWarning: string;
  homeRetry: string;
  homeLoadError: string;
  homePendingMarks: (count: number) => string;
  homePendingSyncing: string;
  homePendingNeedsSupervisor: string;
  homeCurrentState: string;
  homeReadyToStart: string;
  homeOnShiftSince: (time: string) => string;
  homeOnBreakSince: (time: string) => string;
  homeOnShift: string;
  homeOnBreak: string;
  homeWorkLabel: string;
  homeBreakLabel: string;
  homeTodaysMarks: string;
  homeNoMarksToday: string;
  homeBadgeEdited: string;
  homeBadgeOnBehalf: string;

  // ── Shift action buttons ──
  actionStartShift: string;
  actionEndShift: string;
  actionStartBreak: string;
  actionEndBreak: string;

  // ── Event type names ──
  eventCheckIn: string;
  eventCheckOut: string;
  eventBreakStart: string;
  eventBreakEnd: string;

  // ── MarkSequence dialog ──
  markCapture: string;
  markRetake: string;
  markCameraUnavailable: string;
  markCameraDenied: string;
  markCameraNotFound: string;
  markCameraGenericError: string;
  markRetryCamera: string;
  markGeoIdle: string;
  markGeoAcquiring: string;
  markGeoReady: (m: number) => string;
  markGeoApproximate: (m: number) => string;
  markGeoFailedNoCoords: (reason: string) => string;
  markGeoUnavailable: string;
  markGeoDenied: string;
  markGeoUnknown: string;
  markUploading: string;
  markRecording: string;
  markDone: string;
  markUploadFailed: (stage: string) => string;
  markQueuedOffline: string;
  markEventError: string;
  markConfirm: (label: string) => string;
  markCancelAria: string;
  markCloseAria: string;

  // ── PermissionsCheck ──
  permsTitle: string;
  permsLead: string;
  permsCameraLabel: string;
  permsCameraReason: string;
  permsLocationLabel: string;
  permsLocationReason: string;
  permsDeniedHint: string;
  permsGrantButton: string;
  permsRequesting: string;
}

// ─── English (source of truth) ──────────────────────────────────────

const en: AssociateStrings = {
  pickLanguage: "Language",
  signInButton: "Sign in",
  signOut: "Sign out",
  errorGeneric: "Could not sign in",
  retry: "Retry",
  cancel: "Cancel",
  loading: "Loading…",
  signedInAs: (name) => `Signed in as ${name}`,

  loginTitle: "Associate sign in",
  loginSubtitleEmpCode: "Enter your employee ID and PIN",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "Enter your employee ID (e.g. EMP-0042).",
  errorPin: "PIN must be 6 digits.",
  staffSignInLink: "Staff sign in",
  switchToOtpLink: "Sign in with phone OTP instead",

  loginSubtitleOtpPhone: "We'll send a code to your phone",
  loginSubtitleOtpCode: (phone) => `Sent to ${phone}`,
  phoneLabel: "Phone number",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "Send code",
  errorPhone: "Enter a 10-digit Indian mobile number (e.g. 9876543210 or +91 98765 43210).",
  errorSendCode: "Could not send code",
  codeLabel: "6-digit code",
  errorOtpCode: "Incorrect code",
  useDifferentNumberLink: "Use a different number",
  switchToEmpCodeLink: "Use employee ID + PIN instead",
  enterCodeTitle: "Enter code",

  changePinTitle: "Set a new PIN",
  changePinSubtitle: "Choose a 6-digit PIN only you know. You'll use this every time you sign in.",
  changePinCurrentLabel: "Current PIN (the one your supervisor gave you)",
  changePinNewLabel: "New PIN",
  changePinConfirmLabel: "Confirm new PIN",
  changePinHint: "Use 6 digits. Avoid easy guesses like 123456 or your year of birth.",
  changePinErrorNewLength: "New PIN must be 6 digits.",
  changePinErrorMismatch: "PINs don't match.",
  changePinErrorSame: "New PIN must differ from current PIN.",
  changePinErrorGeneric: "Could not change PIN",
  changePinSubmit: "Save and continue",

  homeGreeting: (firstName) => `Hi, ${firstName}`,
  homeNoProperty: "No property assigned",
  homeNoPropertyWarning: "No property assigned. Contact your supervisor before marking attendance.",
  homeRetry: "Retry",
  homeLoadError: "Could not load your status.",
  homePendingMarks: (count) => `${count} pending mark${count === 1 ? "" : "s"}`,
  homePendingSyncing: "syncing…",
  homePendingNeedsSupervisor: "some need supervisor attention",
  homeCurrentState: "Current state",
  homeReadyToStart: "Ready to start",
  homeOnShiftSince: (time) => `On shift since ${time}`,
  homeOnBreakSince: (time) => `On break since ${time}`,
  homeOnShift: "On shift",
  homeOnBreak: "On break",
  homeWorkLabel: "Work",
  homeBreakLabel: "Break",
  homeTodaysMarks: "Today's marks",
  homeNoMarksToday: "No marks yet today.",
  homeBadgeEdited: "edited",
  homeBadgeOnBehalf: "supervisor",

  actionStartShift: "Start shift",
  actionEndShift: "End shift",
  actionStartBreak: "Start break",
  actionEndBreak: "End break",

  eventCheckIn: "Check in",
  eventCheckOut: "Check out",
  eventBreakStart: "Break start",
  eventBreakEnd: "Break end",

  markCapture: "Capture",
  markRetake: "Retake",
  markCameraUnavailable: "Camera not available on this device",
  markCameraDenied: "Camera access denied. Open Settings → Site Settings → enable Camera, then retry.",
  markCameraNotFound: "No front-facing camera found on this device.",
  markCameraGenericError: "Could not start camera",
  markRetryCamera: "Retry camera",
  markGeoIdle: "Waiting for location…",
  markGeoAcquiring: "Getting location…",
  markGeoReady: (m) => `Location ready (±${m}m)`,
  markGeoApproximate: (m) => `Location approximate (±${m}m)`,
  markGeoFailedNoCoords: (reason) => `${reason} — will submit without coords`,
  markGeoUnavailable: "Geolocation unavailable",
  markGeoDenied: "Location permission denied",
  markGeoUnknown: "Location unavailable",
  markUploading: "Uploading photo…",
  markRecording: "Recording event…",
  markDone: "Done",
  markUploadFailed: (stage) => `Selfie upload failed (${stage}). You can retry.`,
  markQueuedOffline: "Saved locally — will retry when network returns.",
  markEventError: "Could not record event",
  markConfirm: (label) => `Confirm ${label.toLowerCase()}`,
  markCancelAria: "Cancel",
  markCloseAria: "Close",

  permsTitle: "Quick setup",
  permsLead: "Two permissions let you mark attendance quickly:",
  permsCameraLabel: "Camera",
  permsCameraReason: "For the selfie that confirms it's you",
  permsLocationLabel: "Location",
  permsLocationReason: "So your supervisor knows you're at the property",
  permsDeniedHint: "If you blocked these before, open Settings → Site Settings to re-enable.",
  permsGrantButton: "Grant access",
  permsRequesting: "Asking…",
};

// ─── Hindi ──────────────────────────────────────────────────────────
// REVIEW: native speaker pass needed.

const hi: AssociateStrings = {
  pickLanguage: "भाषा",
  signInButton: "साइन इन",
  signOut: "साइन आउट",
  errorGeneric: "साइन इन नहीं हो सका",
  retry: "फिर कोशिश करें",
  cancel: "रद्द करें",
  loading: "लोड हो रहा है…",
  signedInAs: (name) => `${name} के रूप में साइन इन`,

  loginTitle: "साथी साइन-इन",
  loginSubtitleEmpCode: "अपना Employee ID और PIN दर्ज करें",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "अपना Employee ID दर्ज करें (उदा. EMP-0042)।",
  errorPin: "PIN 6 अंकों का होना चाहिए।",
  staffSignInLink: "स्टाफ साइन-इन",
  switchToOtpLink: "फोन OTP से साइन इन करें",

  loginSubtitleOtpPhone: "हम आपके फोन पर कोड भेजेंगे",
  loginSubtitleOtpCode: (phone) => `${phone} पर भेजा गया`,
  phoneLabel: "फोन नंबर",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "कोड भेजें",
  errorPhone: "10 अंकों का भारतीय मोबाइल नंबर दर्ज करें (उदा. 9876543210 या +91 98765 43210)।",
  errorSendCode: "कोड नहीं भेजा जा सका",
  codeLabel: "6-अंकीय कोड",
  errorOtpCode: "गलत कोड",
  useDifferentNumberLink: "अलग नंबर का उपयोग करें",
  switchToEmpCodeLink: "Employee ID + PIN से साइन इन करें",
  enterCodeTitle: "कोड दर्ज करें",

  changePinTitle: "नया PIN सेट करें",
  changePinSubtitle: "6 अंकों का PIN चुनें जो केवल आप जानते हों। हर बार साइन इन के लिए इसका उपयोग करें।",
  changePinCurrentLabel: "वर्तमान PIN (जो आपके सुपरवाइज़र ने दिया)",
  changePinNewLabel: "नया PIN",
  changePinConfirmLabel: "नए PIN की पुष्टि करें",
  changePinHint: "6 अंकों का उपयोग करें। 123456 या जन्म वर्ष जैसे आसान अनुमान न रखें।",
  changePinErrorNewLength: "नया PIN 6 अंकों का होना चाहिए।",
  changePinErrorMismatch: "PIN मेल नहीं खाते।",
  changePinErrorSame: "नया PIN वर्तमान PIN से अलग होना चाहिए।",
  changePinErrorGeneric: "PIN नहीं बदला जा सका",
  changePinSubmit: "सहेजें और जारी रखें",

  homeGreeting: (firstName) => `नमस्ते, ${firstName}`,
  homeNoProperty: "कोई प्रॉपर्टी असाइन नहीं",
  homeNoPropertyWarning: "कोई प्रॉपर्टी असाइन नहीं। अटेंडेंस मार्क करने से पहले अपने सुपरवाइज़र से संपर्क करें।",
  homeRetry: "फिर कोशिश करें",
  homeLoadError: "आपकी स्थिति लोड नहीं हो सकी।",
  homePendingMarks: (count) => `${count} पेंडिंग मार्क`,
  homePendingSyncing: "सिंक हो रहा है…",
  homePendingNeedsSupervisor: "कुछ को सुपरवाइज़र की मदद चाहिए",
  homeCurrentState: "मौजूदा स्थिति",
  homeReadyToStart: "शुरू करने के लिए तैयार",
  homeOnShiftSince: (time) => `${time} से शिफ्ट पर`,
  homeOnBreakSince: (time) => `${time} से ब्रेक पर`,
  homeOnShift: "शिफ्ट पर",
  homeOnBreak: "ब्रेक पर",
  homeWorkLabel: "काम",
  homeBreakLabel: "ब्रेक",
  homeTodaysMarks: "आज के मार्क",
  homeNoMarksToday: "आज अभी तक कोई मार्क नहीं।",
  homeBadgeEdited: "एडिटेड",
  homeBadgeOnBehalf: "सुपरवाइज़र",

  actionStartShift: "शिफ्ट शुरू करें",
  actionEndShift: "शिफ्ट खत्म करें",
  actionStartBreak: "ब्रेक शुरू करें",
  actionEndBreak: "ब्रेक खत्म करें",

  eventCheckIn: "चेक इन",
  eventCheckOut: "चेक आउट",
  eventBreakStart: "ब्रेक शुरू",
  eventBreakEnd: "ब्रेक खत्म",

  markCapture: "फोटो लें",
  markRetake: "फिर से लें",
  markCameraUnavailable: "इस डिवाइस पर कैमरा उपलब्ध नहीं है",
  markCameraDenied: "कैमरा एक्सेस अस्वीकृत। Settings → Site Settings → Camera सक्षम करें, फिर फिर कोशिश करें।",
  markCameraNotFound: "इस डिवाइस पर सामने का कैमरा नहीं मिला।",
  markCameraGenericError: "कैमरा शुरू नहीं हो सका",
  markRetryCamera: "कैमरा फिर से कोशिश करें",
  markGeoIdle: "स्थान की प्रतीक्षा…",
  markGeoAcquiring: "स्थान प्राप्त हो रहा है…",
  markGeoReady: (m) => `स्थान तैयार (±${m}मी)`,
  markGeoApproximate: (m) => `स्थान लगभग (±${m}मी)`,
  markGeoFailedNoCoords: (reason) => `${reason} — बिना निर्देशांक के सबमिट होगा`,
  markGeoUnavailable: "जियो-लोकेशन उपलब्ध नहीं",
  markGeoDenied: "स्थान की अनुमति अस्वीकृत",
  markGeoUnknown: "स्थान उपलब्ध नहीं",
  markUploading: "फोटो अपलोड हो रहा है…",
  markRecording: "इवेंट रिकॉर्ड हो रहा है…",
  markDone: "हो गया",
  markUploadFailed: (stage) => `सेल्फी अपलोड विफल (${stage})। आप फिर कोशिश कर सकते हैं।`,
  markQueuedOffline: "स्थानीय रूप से सहेजा गया — नेटवर्क आने पर फिर भेजा जाएगा।",
  markEventError: "इवेंट रिकॉर्ड नहीं हो सका",
  markConfirm: (label) => `${label} पुष्टि करें`,
  markCancelAria: "रद्द करें",
  markCloseAria: "बंद करें",

  permsTitle: "त्वरित सेटअप",
  permsLead: "दो अनुमतियाँ अटेंडेंस मार्क करने में मदद करती हैं:",
  permsCameraLabel: "कैमरा",
  permsCameraReason: "सेल्फी के लिए जो पुष्टि करती है कि यह आप हैं",
  permsLocationLabel: "स्थान",
  permsLocationReason: "ताकि सुपरवाइज़र को पता चले आप प्रॉपर्टी पर हैं",
  permsDeniedHint: "अगर पहले ब्लॉक किया था, Settings → Site Settings में जाकर सक्षम करें।",
  permsGrantButton: "अनुमति दें",
  permsRequesting: "पूछ रहे हैं…",
};

// ─── Marathi ────────────────────────────────────────────────────────
// REVIEW: native speaker pass needed.

const mr: AssociateStrings = {
  pickLanguage: "भाषा",
  signInButton: "साइन इन",
  signOut: "साइन आउट",
  errorGeneric: "साइन इन होऊ शकले नाही",
  retry: "पुन्हा प्रयत्न करा",
  cancel: "रद्द करा",
  loading: "लोड होत आहे…",
  signedInAs: (name) => `${name} म्हणून साइन इन`,

  loginTitle: "सहकारी साइन-इन",
  loginSubtitleEmpCode: "तुमचा Employee ID आणि PIN टाका",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "तुमचा Employee ID टाका (उदा. EMP-0042).",
  errorPin: "PIN 6 अंकी असला पाहिजे.",
  staffSignInLink: "स्टाफ साइन-इन",
  switchToOtpLink: "फोन OTP ने साइन इन करा",

  loginSubtitleOtpPhone: "आम्ही तुमच्या फोनवर कोड पाठवू",
  loginSubtitleOtpCode: (phone) => `${phone} वर पाठवले`,
  phoneLabel: "फोन नंबर",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "कोड पाठवा",
  errorPhone: "10 अंकी भारतीय मोबाइल नंबर टाका (उदा. 9876543210 किंवा +91 98765 43210).",
  errorSendCode: "कोड पाठवता आला नाही",
  codeLabel: "6-अंकी कोड",
  errorOtpCode: "चुकीचा कोड",
  useDifferentNumberLink: "वेगळा नंबर वापरा",
  switchToEmpCodeLink: "Employee ID + PIN ने साइन इन करा",
  enterCodeTitle: "कोड टाका",

  changePinTitle: "नवीन PIN सेट करा",
  changePinSubtitle: "6 अंकी PIN निवडा जो फक्त तुम्हालाच माहीत आहे. साइन इन करताना दर वेळी हाच वापरा.",
  changePinCurrentLabel: "सध्याचा PIN (तुमच्या सुपरवायझरने दिलेला)",
  changePinNewLabel: "नवीन PIN",
  changePinConfirmLabel: "नवीन PIN ची पुष्टी करा",
  changePinHint: "6 अंक वापरा. 123456 किंवा जन्मवर्षासारखे सोपे अनुमान टाळा.",
  changePinErrorNewLength: "नवीन PIN 6 अंकी असला पाहिजे.",
  changePinErrorMismatch: "PIN जुळत नाहीत.",
  changePinErrorSame: "नवीन PIN सध्याच्या PIN पेक्षा वेगळा हवा.",
  changePinErrorGeneric: "PIN बदलता आला नाही",
  changePinSubmit: "जतन करा आणि पुढे जा",

  homeGreeting: (firstName) => `नमस्कार, ${firstName}`,
  homeNoProperty: "प्रॉपर्टी नेमलेली नाही",
  homeNoPropertyWarning: "प्रॉपर्टी नेमलेली नाही. हजेरी नोंदवण्याआधी सुपरवायझरशी संपर्क करा.",
  homeRetry: "पुन्हा प्रयत्न करा",
  homeLoadError: "तुमची स्थिती लोड होऊ शकली नाही.",
  homePendingMarks: (count) => `${count} प्रलंबित नोंद`,
  homePendingSyncing: "सिंक होत आहे…",
  homePendingNeedsSupervisor: "काहींना सुपरवायझरची मदत हवी",
  homeCurrentState: "सध्याची स्थिती",
  homeReadyToStart: "सुरू करण्यास तयार",
  homeOnShiftSince: (time) => `${time} पासून शिफ्टवर`,
  homeOnBreakSince: (time) => `${time} पासून ब्रेकवर`,
  homeOnShift: "शिफ्टवर",
  homeOnBreak: "ब्रेकवर",
  homeWorkLabel: "काम",
  homeBreakLabel: "ब्रेक",
  homeTodaysMarks: "आजच्या नोंदी",
  homeNoMarksToday: "आज अद्याप कोणतीही नोंद नाही.",
  homeBadgeEdited: "एडिट केलेले",
  homeBadgeOnBehalf: "सुपरवायझर",

  actionStartShift: "शिफ्ट सुरू करा",
  actionEndShift: "शिफ्ट संपवा",
  actionStartBreak: "ब्रेक सुरू करा",
  actionEndBreak: "ब्रेक संपवा",

  eventCheckIn: "चेक इन",
  eventCheckOut: "चेक आउट",
  eventBreakStart: "ब्रेक सुरू",
  eventBreakEnd: "ब्रेक संपला",

  markCapture: "फोटो घ्या",
  markRetake: "पुन्हा घ्या",
  markCameraUnavailable: "या डिव्हाइसवर कॅमेरा उपलब्ध नाही",
  markCameraDenied: "कॅमेरा ऍक्सेस नाकारला. Settings → Site Settings → Camera सक्षम करा, मग पुन्हा प्रयत्न करा.",
  markCameraNotFound: "या डिव्हाइसवर समोरचा कॅमेरा सापडला नाही.",
  markCameraGenericError: "कॅमेरा सुरू होऊ शकला नाही",
  markRetryCamera: "कॅमेरा पुन्हा प्रयत्न करा",
  markGeoIdle: "स्थानाची वाट पाहत आहे…",
  markGeoAcquiring: "स्थान मिळवत आहे…",
  markGeoReady: (m) => `स्थान तयार (±${m}मी)`,
  markGeoApproximate: (m) => `स्थान अंदाजे (±${m}मी)`,
  markGeoFailedNoCoords: (reason) => `${reason} — निर्देशांकाशिवाय पाठवले जाईल`,
  markGeoUnavailable: "जिओ-लोकेशन उपलब्ध नाही",
  markGeoDenied: "स्थानाची परवानगी नाकारली",
  markGeoUnknown: "स्थान उपलब्ध नाही",
  markUploading: "फोटो अपलोड होत आहे…",
  markRecording: "इव्हेंट नोंदवत आहे…",
  markDone: "झाले",
  markUploadFailed: (stage) => `सेल्फी अपलोड अयशस्वी (${stage}). पुन्हा प्रयत्न करू शकता.`,
  markQueuedOffline: "स्थानिक पातळीवर जतन — नेटवर्क आल्यावर पुन्हा पाठवले जाईल.",
  markEventError: "इव्हेंट नोंदवता आला नाही",
  markConfirm: (label) => `${label} ची पुष्टी करा`,
  markCancelAria: "रद्द करा",
  markCloseAria: "बंद करा",

  permsTitle: "जलद सेटअप",
  permsLead: "दोन परवानग्यांमुळे हजेरी पटकन नोंदवता येते:",
  permsCameraLabel: "कॅमेरा",
  permsCameraReason: "तुमचीच सेल्फी हे सिद्ध करण्यासाठी",
  permsLocationLabel: "स्थान",
  permsLocationReason: "जेणेकरून सुपरवायझरला कळेल तुम्ही प्रॉपर्टीवर आहात",
  permsDeniedHint: "आधी ब्लॉक केले असल्यास Settings → Site Settings मध्ये जाऊन सक्षम करा.",
  permsGrantButton: "परवानगी द्या",
  permsRequesting: "विचारत आहोत…",
};

// ─── Bengali ────────────────────────────────────────────────────────
// REVIEW: native speaker pass needed.

const bn: AssociateStrings = {
  pickLanguage: "ভাষা",
  signInButton: "সাইন ইন",
  signOut: "সাইন আউট",
  errorGeneric: "সাইন ইন করা যায়নি",
  retry: "আবার চেষ্টা করুন",
  cancel: "বাতিল",
  loading: "লোড হচ্ছে…",
  signedInAs: (name) => `${name} হিসেবে সাইন ইন`,

  loginTitle: "সহকারী সাইন-ইন",
  loginSubtitleEmpCode: "আপনার Employee ID এবং PIN দিন",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "আপনার Employee ID দিন (যেমন EMP-0042)।",
  errorPin: "PIN অবশ্যই 6 সংখ্যার হতে হবে।",
  staffSignInLink: "স্টাফ সাইন-ইন",
  switchToOtpLink: "ফোন OTP দিয়ে সাইন ইন করুন",

  loginSubtitleOtpPhone: "আমরা আপনার ফোনে একটি কোড পাঠাব",
  loginSubtitleOtpCode: (phone) => `${phone} এ পাঠানো হয়েছে`,
  phoneLabel: "ফোন নম্বর",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "কোড পাঠান",
  errorPhone: "একটি 10-সংখ্যার ভারতীয় মোবাইল নম্বর দিন (যেমন 9876543210 বা +91 98765 43210)।",
  errorSendCode: "কোড পাঠানো যায়নি",
  codeLabel: "6-সংখ্যার কোড",
  errorOtpCode: "ভুল কোড",
  useDifferentNumberLink: "অন্য নম্বর ব্যবহার করুন",
  switchToEmpCodeLink: "Employee ID + PIN দিয়ে সাইন ইন করুন",
  enterCodeTitle: "কোড দিন",

  changePinTitle: "নতুন PIN সেট করুন",
  changePinSubtitle: "6-সংখ্যার একটি PIN বেছে নিন যা শুধু আপনি জানেন। প্রতিবার সাইন ইন করতে এটাই ব্যবহার করবেন।",
  changePinCurrentLabel: "বর্তমান PIN (যা আপনার সুপারভাইজার দিয়েছিলেন)",
  changePinNewLabel: "নতুন PIN",
  changePinConfirmLabel: "নতুন PIN নিশ্চিত করুন",
  changePinHint: "6 সংখ্যা ব্যবহার করুন। 123456 বা জন্মসাল-এর মতো সহজ অনুমান এড়িয়ে চলুন।",
  changePinErrorNewLength: "নতুন PIN অবশ্যই 6 সংখ্যার হতে হবে।",
  changePinErrorMismatch: "PIN মিলছে না।",
  changePinErrorSame: "নতুন PIN বর্তমান PIN থেকে আলাদা হতে হবে।",
  changePinErrorGeneric: "PIN পরিবর্তন করা যায়নি",
  changePinSubmit: "সংরক্ষণ ও এগিয়ে যান",

  homeGreeting: (firstName) => `নমস্কার, ${firstName}`,
  homeNoProperty: "কোনো প্রপার্টি নির্ধারিত নেই",
  homeNoPropertyWarning: "কোনো প্রপার্টি নির্ধারিত নেই। হাজিরা চিহ্নিত করার আগে সুপারভাইজারের সাথে যোগাযোগ করুন।",
  homeRetry: "আবার চেষ্টা করুন",
  homeLoadError: "আপনার অবস্থা লোড করা যায়নি।",
  homePendingMarks: (count) => `${count} অপেক্ষমাণ মার্ক`,
  homePendingSyncing: "সিঙ্ক হচ্ছে…",
  homePendingNeedsSupervisor: "কিছুর জন্য সুপারভাইজারের সাহায্য দরকার",
  homeCurrentState: "বর্তমান অবস্থা",
  homeReadyToStart: "শুরু করার জন্য প্রস্তুত",
  homeOnShiftSince: (time) => `${time} থেকে শিফটে`,
  homeOnBreakSince: (time) => `${time} থেকে বিরতিতে`,
  homeOnShift: "শিফটে",
  homeOnBreak: "বিরতিতে",
  homeWorkLabel: "কাজ",
  homeBreakLabel: "বিরতি",
  homeTodaysMarks: "আজকের মার্কসমূহ",
  homeNoMarksToday: "আজ এখনও কোনো মার্ক নেই।",
  homeBadgeEdited: "সম্পাদিত",
  homeBadgeOnBehalf: "সুপারভাইজার",

  actionStartShift: "শিফট শুরু করুন",
  actionEndShift: "শিফট শেষ করুন",
  actionStartBreak: "বিরতি শুরু",
  actionEndBreak: "বিরতি শেষ",

  eventCheckIn: "চেক ইন",
  eventCheckOut: "চেক আউট",
  eventBreakStart: "বিরতি শুরু",
  eventBreakEnd: "বিরতি শেষ",

  markCapture: "ছবি তুলুন",
  markRetake: "আবার তুলুন",
  markCameraUnavailable: "এই ডিভাইসে ক্যামেরা পাওয়া যাচ্ছে না",
  markCameraDenied: "ক্যামেরা অ্যাক্সেস অস্বীকৃত। Settings → Site Settings → Camera সক্ষম করুন, তারপর আবার চেষ্টা করুন।",
  markCameraNotFound: "এই ডিভাইসে সামনের ক্যামেরা পাওয়া যায়নি।",
  markCameraGenericError: "ক্যামেরা চালু করা যায়নি",
  markRetryCamera: "ক্যামেরা পুনরায় চেষ্টা করুন",
  markGeoIdle: "লোকেশনের অপেক্ষা…",
  markGeoAcquiring: "লোকেশন আনা হচ্ছে…",
  markGeoReady: (m) => `লোকেশন প্রস্তুত (±${m}মি)`,
  markGeoApproximate: (m) => `লোকেশন আনুমানিক (±${m}মি)`,
  markGeoFailedNoCoords: (reason) => `${reason} — কোঅর্ডিনেট ছাড়াই পাঠানো হবে`,
  markGeoUnavailable: "জিও-লোকেশন উপলব্ধ নেই",
  markGeoDenied: "লোকেশন অনুমতি অস্বীকৃত",
  markGeoUnknown: "লোকেশন উপলব্ধ নেই",
  markUploading: "ছবি আপলোড হচ্ছে…",
  markRecording: "ইভেন্ট রেকর্ড হচ্ছে…",
  markDone: "হয়ে গেছে",
  markUploadFailed: (stage) => `সেলফি আপলোড ব্যর্থ (${stage})। আপনি আবার চেষ্টা করতে পারেন।`,
  markQueuedOffline: "স্থানীয়ভাবে সংরক্ষিত — নেটওয়ার্ক ফিরলে আবার পাঠানো হবে।",
  markEventError: "ইভেন্ট রেকর্ড করা যায়নি",
  markConfirm: (label) => `${label} নিশ্চিত করুন`,
  markCancelAria: "বাতিল",
  markCloseAria: "বন্ধ",

  permsTitle: "দ্রুত সেটআপ",
  permsLead: "দুটি অনুমতি হাজিরা চিহ্নিত করা সহজ করে:",
  permsCameraLabel: "ক্যামেরা",
  permsCameraReason: "সেলফির জন্য যা প্রমাণ করে এটা আপনি",
  permsLocationLabel: "লোকেশন",
  permsLocationReason: "যাতে সুপারভাইজার জানতে পারেন আপনি প্রপার্টিতে আছেন",
  permsDeniedHint: "আগে ব্লক করে থাকলে Settings → Site Settings থেকে সক্ষম করুন।",
  permsGrantButton: "অনুমতি দিন",
  permsRequesting: "জিজ্ঞাসা করা হচ্ছে…",
};

// ─── Tamil ──────────────────────────────────────────────────────────
// REVIEW: native speaker pass needed.

const ta: AssociateStrings = {
  pickLanguage: "மொழி",
  signInButton: "உள்நுழை",
  signOut: "வெளியேறு",
  errorGeneric: "உள்நுழைய முடியவில்லை",
  retry: "மீண்டும் முயற்சி",
  cancel: "ரத்து",
  loading: "ஏற்றுகிறது…",
  signedInAs: (name) => `${name} ஆக உள்நுழைந்துள்ளீர்கள்`,

  loginTitle: "உதவியாளர் உள்நுழைவு",
  loginSubtitleEmpCode: "உங்கள் Employee ID மற்றும் PIN ஐ உள்ளிடவும்",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "உங்கள் Employee ID ஐ உள்ளிடவும் (எ.கா. EMP-0042).",
  errorPin: "PIN 6 இலக்கங்களாக இருக்க வேண்டும்.",
  staffSignInLink: "ஊழியர் உள்நுழைவு",
  switchToOtpLink: "தொலைபேசி OTP மூலம் உள்நுழைக",

  loginSubtitleOtpPhone: "உங்கள் தொலைபேசிக்கு குறியீட்டை அனுப்புவோம்",
  loginSubtitleOtpCode: (phone) => `${phone} க்கு அனுப்பப்பட்டது`,
  phoneLabel: "தொலைபேசி எண்",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "குறியீட்டை அனுப்பு",
  errorPhone: "10-இலக்க இந்திய மொபைல் எண்ணை உள்ளிடவும் (எ.கா. 9876543210 அல்லது +91 98765 43210).",
  errorSendCode: "குறியீட்டை அனுப்ப முடியவில்லை",
  codeLabel: "6-இலக்க குறியீடு",
  errorOtpCode: "தவறான குறியீடு",
  useDifferentNumberLink: "வேறு எண்ணைப் பயன்படுத்து",
  switchToEmpCodeLink: "Employee ID + PIN மூலம் உள்நுழைக",
  enterCodeTitle: "குறியீட்டை உள்ளிடவும்",

  changePinTitle: "புதிய PIN அமைக்கவும்",
  changePinSubtitle: "உங்களுக்கு மட்டுமே தெரிந்த 6-இலக்க PIN தேர்வு செய்யவும். ஒவ்வொரு முறையும் உள்நுழைய இதைப் பயன்படுத்துவீர்கள்.",
  changePinCurrentLabel: "தற்போதைய PIN (உங்கள் சூப்பர்வைசர் கொடுத்தது)",
  changePinNewLabel: "புதிய PIN",
  changePinConfirmLabel: "புதிய PIN ஐ உறுதிப்படுத்து",
  changePinHint: "6 இலக்கங்களைப் பயன்படுத்தவும். 123456 அல்லது பிறந்த ஆண்டு போன்ற எளிய ஊகங்களைத் தவிர்க்கவும்.",
  changePinErrorNewLength: "புதிய PIN 6 இலக்கங்களாக இருக்க வேண்டும்.",
  changePinErrorMismatch: "PIN கள் பொருந்தவில்லை.",
  changePinErrorSame: "புதிய PIN தற்போதைய PIN-இல் இருந்து வேறுபட வேண்டும்.",
  changePinErrorGeneric: "PIN ஐ மாற்ற முடியவில்லை",
  changePinSubmit: "சேமித்து தொடரவும்",

  homeGreeting: (firstName) => `வணக்கம், ${firstName}`,
  homeNoProperty: "சொத்து ஒதுக்கப்படவில்லை",
  homeNoPropertyWarning: "சொத்து ஒதுக்கப்படவில்லை. வருகையைப் பதிவு செய்ய முன், சூப்பர்வைசரைத் தொடர்பு கொள்ளவும்.",
  homeRetry: "மீண்டும் முயற்சி",
  homeLoadError: "உங்கள் நிலையை ஏற்ற முடியவில்லை.",
  homePendingMarks: (count) => `${count} நிலுவையில் உள்ள பதிவு`,
  homePendingSyncing: "ஒத்திசைகிறது…",
  homePendingNeedsSupervisor: "சிலவற்றுக்கு சூப்பர்வைசர் உதவி தேவை",
  homeCurrentState: "தற்போதைய நிலை",
  homeReadyToStart: "தொடங்க தயார்",
  homeOnShiftSince: (time) => `${time} முதல் ஷிப்டில்`,
  homeOnBreakSince: (time) => `${time} முதல் இடைவேளையில்`,
  homeOnShift: "ஷிப்டில்",
  homeOnBreak: "இடைவேளையில்",
  homeWorkLabel: "வேலை",
  homeBreakLabel: "இடைவேளை",
  homeTodaysMarks: "இன்றைய பதிவுகள்",
  homeNoMarksToday: "இன்றைக்கு இன்னும் பதிவுகள் இல்லை.",
  homeBadgeEdited: "திருத்தப்பட்டது",
  homeBadgeOnBehalf: "சூப்பர்வைசர்",

  actionStartShift: "ஷிப்ட் தொடங்கு",
  actionEndShift: "ஷிப்ட் முடிக்கவும்",
  actionStartBreak: "இடைவேளை தொடங்கு",
  actionEndBreak: "இடைவேளை முடிக்கவும்",

  eventCheckIn: "செக் இன்",
  eventCheckOut: "செக் அவுட்",
  eventBreakStart: "இடைவேளை தொடக்கம்",
  eventBreakEnd: "இடைவேளை முடிவு",

  markCapture: "புகைப்படம் எடு",
  markRetake: "மீண்டும் எடு",
  markCameraUnavailable: "இந்த சாதனத்தில் கேமரா கிடைக்கவில்லை",
  markCameraDenied: "கேமரா அனுமதி மறுக்கப்பட்டது. Settings → Site Settings → Camera ஐ இயக்கிய பின் மீண்டும் முயற்சிக்கவும்.",
  markCameraNotFound: "இந்த சாதனத்தில் முன்புற கேமரா இல்லை.",
  markCameraGenericError: "கேமராவைத் தொடங்க முடியவில்லை",
  markRetryCamera: "கேமராவை மீண்டும் முயற்சிக்கவும்",
  markGeoIdle: "இருப்பிடத்துக்கு காத்திருக்கிறது…",
  markGeoAcquiring: "இருப்பிடம் பெறப்படுகிறது…",
  markGeoReady: (m) => `இருப்பிடம் தயார் (±${m}மீ)`,
  markGeoApproximate: (m) => `இருப்பிடம் தோராயம் (±${m}மீ)`,
  markGeoFailedNoCoords: (reason) => `${reason} — ஆயங்கள் இல்லாமல் அனுப்பப்படும்`,
  markGeoUnavailable: "ஜியோ-லொகேஷன் கிடைக்கவில்லை",
  markGeoDenied: "இருப்பிட அனுமதி மறுக்கப்பட்டது",
  markGeoUnknown: "இருப்பிடம் கிடைக்கவில்லை",
  markUploading: "புகைப்படம் பதிவேற்றப்படுகிறது…",
  markRecording: "நிகழ்வு பதிவாகிறது…",
  markDone: "முடிந்தது",
  markUploadFailed: (stage) => `செல்ஃபி பதிவேற்றம் தோல்வி (${stage}). மீண்டும் முயற்சிக்கலாம்.`,
  markQueuedOffline: "உள்ளூரில் சேமிக்கப்பட்டது — இணைப்பு திரும்பியதும் மீண்டும் அனுப்பப்படும்.",
  markEventError: "நிகழ்வைப் பதிவு செய்ய முடியவில்லை",
  markConfirm: (label) => `${label} ஐ உறுதி செய்யவும்`,
  markCancelAria: "ரத்து",
  markCloseAria: "மூடு",

  permsTitle: "விரைவான அமைப்பு",
  permsLead: "இரண்டு அனுமதிகள் வருகையைப் பதிவு செய்ய உதவும்:",
  permsCameraLabel: "கேமரா",
  permsCameraReason: "நீங்கள் தான் என்பதை உறுதிப்படுத்தும் செல்ஃபிக்காக",
  permsLocationLabel: "இருப்பிடம்",
  permsLocationReason: "நீங்கள் சொத்தில் இருப்பதை சூப்பர்வைசர் அறிய",
  permsDeniedHint: "முன்பு தடுத்திருந்தால் Settings → Site Settings இல் இயக்கவும்.",
  permsGrantButton: "அனுமதி அளி",
  permsRequesting: "கேட்கிறோம்…",
};

// ─── Telugu ─────────────────────────────────────────────────────────
// REVIEW: native speaker pass needed.

const te: AssociateStrings = {
  pickLanguage: "భాష",
  signInButton: "సైన్ ఇన్",
  signOut: "సైన్ అవుట్",
  errorGeneric: "సైన్ ఇన్ చేయలేకపోయాం",
  retry: "మళ్ళీ ప్రయత్నించండి",
  cancel: "రద్దు",
  loading: "లోడ్ అవుతోంది…",
  signedInAs: (name) => `${name} గా సైన్ ఇన్`,

  loginTitle: "సహాయక సైన్-ఇన్",
  loginSubtitleEmpCode: "మీ Employee ID మరియు PIN నమోదు చేయండి",
  employeeIdLabel: "Employee ID",
  employeeIdPlaceholder: "EMP-0042",
  pinLabel: "PIN",
  errorEmployeeId: "మీ Employee ID నమోదు చేయండి (ఉదా. EMP-0042).",
  errorPin: "PIN తప్పనిసరిగా 6 అంకెలు ఉండాలి.",
  staffSignInLink: "సిబ్బంది సైన్-ఇన్",
  switchToOtpLink: "ఫోన్ OTP తో సైన్ ఇన్ చేయండి",

  loginSubtitleOtpPhone: "మేము మీ ఫోన్‌కు కోడ్ పంపుతాము",
  loginSubtitleOtpCode: (phone) => `${phone} కు పంపబడింది`,
  phoneLabel: "ఫోన్ నంబర్",
  phonePlaceholder: "+91 98765 43210",
  sendCodeButton: "కోడ్ పంపండి",
  errorPhone: "10-అంకెల భారతీయ మొబైల్ నంబర్ నమోదు చేయండి (ఉదా. 9876543210 లేదా +91 98765 43210).",
  errorSendCode: "కోడ్ పంపలేకపోయాం",
  codeLabel: "6-అంకెల కోడ్",
  errorOtpCode: "తప్పు కోడ్",
  useDifferentNumberLink: "వేరే నంబర్ ఉపయోగించండి",
  switchToEmpCodeLink: "Employee ID + PIN తో సైన్ ఇన్ చేయండి",
  enterCodeTitle: "కోడ్ నమోదు చేయండి",

  changePinTitle: "కొత్త PIN సెట్ చేయండి",
  changePinSubtitle: "మీకు మాత్రమే తెలిసిన 6-అంకెల PIN ఎంచుకోండి. ప్రతిసారీ సైన్ ఇన్ కు ఇదే ఉపయోగిస్తారు.",
  changePinCurrentLabel: "ప్రస్తుత PIN (మీ సూపర్‌వైజర్ ఇచ్చినది)",
  changePinNewLabel: "కొత్త PIN",
  changePinConfirmLabel: "కొత్త PIN నిర్ధారించండి",
  changePinHint: "6 అంకెలు ఉపయోగించండి. 123456 లేదా పుట్టిన సంవత్సరం లాంటి సులభమైన అంచనాలను నివారించండి.",
  changePinErrorNewLength: "కొత్త PIN తప్పనిసరిగా 6 అంకెలు ఉండాలి.",
  changePinErrorMismatch: "PIN లు సరిపోలడం లేదు.",
  changePinErrorSame: "కొత్త PIN ప్రస్తుత PIN కంటే భిన్నంగా ఉండాలి.",
  changePinErrorGeneric: "PIN మార్చలేకపోయాం",
  changePinSubmit: "సేవ్ చేసి కొనసాగండి",

  homeGreeting: (firstName) => `నమస్కారం, ${firstName}`,
  homeNoProperty: "ఆస్తి కేటాయించలేదు",
  homeNoPropertyWarning: "ఆస్తి కేటాయించలేదు. హాజరు మార్క్ చేసే ముందు సూపర్‌వైజర్‌ని సంప్రదించండి.",
  homeRetry: "మళ్ళీ ప్రయత్నించండి",
  homeLoadError: "మీ స్థితిని లోడ్ చేయలేకపోయాం.",
  homePendingMarks: (count) => `${count} పెండింగ్ మార్క్`,
  homePendingSyncing: "సింక్ అవుతోంది…",
  homePendingNeedsSupervisor: "కొన్నింటికి సూపర్‌వైజర్ సహాయం అవసరం",
  homeCurrentState: "ప్రస్తుత స్థితి",
  homeReadyToStart: "ప్రారంభించడానికి సిద్ధం",
  homeOnShiftSince: (time) => `${time} నుండి షిఫ్ట్‌లో`,
  homeOnBreakSince: (time) => `${time} నుండి విరామంలో`,
  homeOnShift: "షిఫ్ట్‌లో",
  homeOnBreak: "విరామంలో",
  homeWorkLabel: "పని",
  homeBreakLabel: "విరామం",
  homeTodaysMarks: "నేటి మార్క్‌లు",
  homeNoMarksToday: "నేడు ఇంకా మార్క్‌లు లేవు.",
  homeBadgeEdited: "ఎడిట్ చేయబడింది",
  homeBadgeOnBehalf: "సూపర్‌వైజర్",

  actionStartShift: "షిఫ్ట్ ప్రారంభించండి",
  actionEndShift: "షిఫ్ట్ ముగించండి",
  actionStartBreak: "విరామం ప్రారంభించండి",
  actionEndBreak: "విరామం ముగించండి",

  eventCheckIn: "చెక్ ఇన్",
  eventCheckOut: "చెక్ అవుట్",
  eventBreakStart: "విరామం ప్రారంభం",
  eventBreakEnd: "విరామం ముగింపు",

  markCapture: "ఫోటో తీయండి",
  markRetake: "మళ్ళీ తీయండి",
  markCameraUnavailable: "ఈ పరికరంలో కెమెరా అందుబాటులో లేదు",
  markCameraDenied: "కెమెరా యాక్సెస్ నిరాకరించబడింది. Settings → Site Settings → Camera ప్రారంభించి మళ్ళీ ప్రయత్నించండి.",
  markCameraNotFound: "ఈ పరికరంలో ముందు కెమెరా దొరకలేదు.",
  markCameraGenericError: "కెమెరా ప్రారంభించలేకపోయాం",
  markRetryCamera: "కెమెరా మళ్ళీ ప్రయత్నించండి",
  markGeoIdle: "స్థానం కోసం వేచి ఉంది…",
  markGeoAcquiring: "స్థానం పొందుతోంది…",
  markGeoReady: (m) => `స్థానం సిద్ధం (±${m}మీ)`,
  markGeoApproximate: (m) => `స్థానం సుమారు (±${m}మీ)`,
  markGeoFailedNoCoords: (reason) => `${reason} — కోఆర్డినేట్‌లు లేకుండా సమర్పించబడుతుంది`,
  markGeoUnavailable: "జియో-లొకేషన్ అందుబాటులో లేదు",
  markGeoDenied: "స్థాన అనుమతి నిరాకరించబడింది",
  markGeoUnknown: "స్థానం అందుబాటులో లేదు",
  markUploading: "ఫోటో అప్‌లోడ్ అవుతోంది…",
  markRecording: "ఈవెంట్ నమోదు అవుతోంది…",
  markDone: "పూర్తయింది",
  markUploadFailed: (stage) => `సెల్ఫీ అప్‌లోడ్ విఫలం (${stage}). మళ్ళీ ప్రయత్నించవచ్చు.`,
  markQueuedOffline: "స్థానికంగా సేవ్ చేయబడింది — నెట్‌వర్క్ తిరిగి వచ్చినప్పుడు మళ్ళీ పంపబడుతుంది.",
  markEventError: "ఈవెంట్ రికార్డ్ చేయలేకపోయాం",
  markConfirm: (label) => `${label} నిర్ధారించండి`,
  markCancelAria: "రద్దు",
  markCloseAria: "మూసివేయండి",

  permsTitle: "శీఘ్ర సెటప్",
  permsLead: "రెండు అనుమతులు హాజరు మార్క్ చేయడాన్ని తేలికగా చేస్తాయి:",
  permsCameraLabel: "కెమెరా",
  permsCameraReason: "ఇది మీరే అని నిర్ధారించే సెల్ఫీ కోసం",
  permsLocationLabel: "స్థానం",
  permsLocationReason: "మీరు ఆస్తిలో ఉన్నారని సూపర్‌వైజర్‌కు తెలుసుకోవడానికి",
  permsDeniedHint: "ఇంతకుముందు బ్లాక్ చేసి ఉంటే Settings → Site Settings లో ప్రారంభించండి.",
  permsGrantButton: "అనుమతి ఇవ్వండి",
  permsRequesting: "అడుగుతున్నాం…",
};

const DICTIONARIES: Record<Locale, AssociateStrings> = { en, hi, mr, bn, ta, te };

const STORAGE_KEY = "ember.locale.associate";

function readStoredLocale(): Locale {
  if (typeof globalThis === "undefined" || typeof (globalThis as any).localStorage === "undefined") {
    return "en";
  }
  try {
    const stored = (globalThis as any).localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DICTIONARIES) return stored as Locale;
  } catch {
    /* private mode / storage unavailable */
  }
  return "en";
}

function writeStoredLocale(locale: Locale): void {
  if (typeof globalThis === "undefined" || typeof (globalThis as any).localStorage === "undefined") return;
  try {
    (globalThis as any).localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* private mode / quota exceeded */
  }
}

/**
 * Subscribes the component to the associate locale. Single source of truth
 * across login + post-login pages — locale changes anywhere update everywhere
 * via storage event + in-tab listeners.
 */
const listeners = new Set<(l: Locale) => void>();

export function useAssociateLocale(): {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: AssociateStrings;
} {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  useEffect(() => {
    const onCrossTab = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue in DICTIONARIES) {
        setLocaleState(e.newValue as Locale);
      }
    };
    const onInTab = (l: Locale) => setLocaleState(l);
    if (typeof window !== "undefined") window.addEventListener("storage", onCrossTab);
    listeners.add(onInTab);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("storage", onCrossTab);
      listeners.delete(onInTab);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    writeStoredLocale(l);
    listeners.forEach((fn) => fn(l));
  };

  return { locale, setLocale, t: DICTIONARIES[locale] ?? en };
}
