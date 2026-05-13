import axios, { isAxiosError } from "axios";
import { ENV } from "../_core/env";

export interface SmsOtpMessage { to: string; code: string; }
export interface SmsMessage { to: string; body: string; }
export interface SmsResult { ok: boolean; id?: string; error?: string; raw?: unknown; }

const MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp";

/**
 * Normalises a phone for MSG91:
 *   "+91 98765 43210"  ->  "919876543210"
 *   "9876543210"       ->  "919876543210"   (prepends default country code)
 * MSG91 expects digits-only with country code, no '+'.
 */
export function normalisePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits;
  if (digits.length === 10) return `${ENV.msg91DefaultCountryCode}${digits}`;
  return digits;
}

export async function sendOtpSms(msg: SmsOtpMessage): Promise<SmsResult> {
  if (!ENV.msg91AuthKey) {
    console.log("[sms:DEV otp]", { to: msg.to, code: msg.code });
    return { ok: true, id: "dev-stub" };
  }

  const phone = normalisePhone(msg.to);

  // MSG91 v5 OTP endpoint uses `mobile` (singular) per their current docs.
  // Query-string params; `authkey` goes in the header.
  const params: Record<string, string> = {
    mobile: phone,
    otp: msg.code,
    otp_length: String(ENV.msg91OtpLength),
    otp_expiry: String(ENV.msg91OtpExpiryMinutes),
  };
  if (ENV.msg91TemplateIdOtp) params.template_id = ENV.msg91TemplateIdOtp;
  if (ENV.msg91SenderId) params.sender = ENV.msg91SenderId;

  console.log("[sms] MSG91 OTP request →", { url: MSG91_OTP_URL, params });

  try {
    const res = await axios.post(MSG91_OTP_URL, null, {
      params,
      headers: {
        authkey: ENV.msg91AuthKey,
        accept: "application/json",
      },
      timeout: 10_000,
    });
    console.log("[sms] MSG91 OTP response ←", res.data);
    const data = res.data as { type?: string; request_id?: string; message?: string };
    if (data?.type === "success") {
      return { ok: true, id: data.request_id, raw: data };
    }
    return {
      ok: false,
      error: data?.message ?? "MSG91 returned non-success response",
      raw: data,
    };
  } catch (err) {
    const data = isAxiosError(err) ? err.response?.data : undefined;
    const message =
      (isAxiosError(err) &&
        (data as { message?: string } | undefined)?.message) ||
      (err instanceof Error ? err.message : "Unknown MSG91 error");
    console.error("[sms] MSG91 OTP error ←", { message, data });
    return { ok: false, error: message, raw: data };
  }
}

export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  if (!ENV.msg91AuthKey) {
    console.log("[sms:DEV]", { to: msg.to, body: msg.body });
    return { ok: true, id: "dev-stub" };
  }
  console.warn("[sms] sendSms (non-OTP) not yet implemented in shared-defaults mode");
  return { ok: true, id: "stub-not-implemented" };
}

export function otpSms(code: string, expiresInMin: number): string {
  return `Your Ember verification code is ${code}. It expires in ${expiresInMin} minutes.`;
}
