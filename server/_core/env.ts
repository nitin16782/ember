import "dotenv/config";

export const ENV = {
  // Core
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3000", 10),
  isProduction: process.env.NODE_ENV === "production",

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Auth (used by Prompt 3 and beyond)
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtAccessTtlSeconds: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? "900", 10),
  jwtRefreshTtlSeconds: parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? "2592000", 10),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10),

  // Cloudflare R2 (used by Prompt 6)
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "ember-dev",
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? "",

  // MSG91 — SMS / OTP (shared-defaults path; DLT-branded headers in Phase 7)
  msg91AuthKey: process.env.MSG91_AUTH_KEY ?? "",
  msg91DefaultCountryCode: process.env.MSG91_DEFAULT_COUNTRY_CODE ?? "91",
  msg91OtpExpiryMinutes: parseInt(process.env.MSG91_OTP_EXPIRY_MINUTES ?? "10", 10),
  msg91OtpLength: parseInt(process.env.MSG91_OTP_LENGTH ?? "6", 10),

  // Optional — only set in Phase 7 when DLT-approved templates exist
  msg91TemplateIdOtp: process.env.MSG91_TEMPLATE_ID_OTP ?? "",
  msg91SenderId: process.env.MSG91_SENDER_ID ?? "",

  // Email (used by Prompt 3)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "ember@firebrick.one",
  resendFromName: process.env.RESEND_FROM_NAME ?? "Ember by Firebrick",

  // Hostnames (Stage 2 deploy)
  staffHostname: process.env.STAFF_HOSTNAME ?? "app.firebrick.one",
  apiHostname: process.env.API_HOSTNAME ?? "api.firebrick.one",
  ownerHostname: process.env.OWNER_HOSTNAME ?? "clients.firebrick.one",
};

export function validateEnv(): void {
  if (!ENV.isProduction) return;
  const required: Array<[string, string]> = [
    ["DATABASE_URL", ENV.databaseUrl],
    ["JWT_SECRET", ENV.jwtSecret],
  ];
  const missing = required.filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
