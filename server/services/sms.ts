import axios, { type AxiosInstance } from "axios";
import { ENV } from "../_core/env";

export interface SmsOtpMessage {
  to: string;
  code: string;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsResult {
  ok: boolean;
  id?: string;
  error?: string;
  raw?: unknown;
}

// ─── HTTP client ────────────────────────────────────────────────────

let _client: AxiosInstance | null = null;
function getClient(): AxiosInstance {
  if (!_client) {
    _client = axios.create({
      baseURL: "https://control.msg91.com/api/v5",
      timeout: 10_000,
      headers: { "Content-Type": "application/json" },
    });
  }
  return _client;
}

// ─── Phone number normalisation ─────────────────────────────────────

/**
 * Normalises a phone number for MSG91:
 *   "+91 98765 43210"  ->  "919876543210"
 *   "9876543210"       ->  "919876543210"   (prepends default country code)
 *   "+447911123456"    ->  "447911123456"
 *
 * MSG91 expects digits-only with country code, no '+'.
 */
export function normalisePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits;
  if (digits.length === 10) return `${ENV.msg91DefaultCountryCode}${digits}`;
  return digits;
}

// ─── Send OTP via MSG91's /otp endpoint ─────────────────────────────

/**
 * MSG91 /api/v5/otp endpoint. We pass the OTP code we generated so we
 * can verify it locally; MSG91 routes via their shared OTP header by
 * default. In Phase 7, when our DLT template is approved, the optional
 * template_id and sender fields opt us into branded delivery.
 *
 * Docs: https://docs.msg91.com/p/tf9GTextN/e/H8nQO_4PJj
 */
export async function sendOtpSms(msg: SmsOtpMessage): Promise<SmsResult> {
  if (!ENV.msg91AuthKey) {
    console.log("[sms:DEV otp]", { to: msg.to, code: msg.code });
    return { ok: true, id: "dev-stub" };
  }

  const phone = normalisePhone(msg.to);

  const payload: Record<string, unknown> = {
    mobile: phone,
    otp: msg.code,
    otp_length: msg.code.length,
    otp_expiry: ENV.msg91OtpExpiryMinutes,
  };
  if (ENV.msg91TemplateIdOtp) payload.template_id = ENV.msg91TemplateIdOtp;
  if (ENV.msg91SenderId) payload.sender = ENV.msg91SenderId;

  // Mask the OTP in logs so a leaked log file isn't an account takeover.
  const loggablePayload = { ...payload, otp: "******" };

  try {
    const resp = await getClient().post("/otp", payload, {
      headers: { authkey: ENV.msg91AuthKey },
    });

    if (resp.data?.type === "success") {
      const id = resp.data.request_id ?? resp.data.message ?? "ok";
      console.log("[sms] MSG91 OTP sent:", {
        to: phone,
        request_id: id,
        // Surface the full response body — MSG91 sometimes returns
        // type=success while still dropping the SMS upstream (DLT
        // template not approved, sender not registered, DND, etc.).
        // The dashboard at https://control.msg91.com/app/logs/sms is
        // the source of truth for delivery — this log just confirms
        // the API accepted the request.
        response: resp.data,
        request: loggablePayload,
      });
      return { ok: true, id: String(id), raw: resp.data };
    }

    const errMsg = resp.data?.message ?? "MSG91 returned non-success";
    console.error("[sms] MSG91 OTP send failed:", {
      to: phone,
      error: errMsg,
      response: resp.data,
      request: loggablePayload,
    });
    return { ok: false, error: errMsg, raw: resp.data };
  } catch (err) {
    const axiosErr = err as {
      response?: { data?: unknown; status?: number };
      message?: string;
    };
    const msgText =
      typeof axiosErr.response?.data === "object" && axiosErr.response?.data !== null
        ? JSON.stringify(axiosErr.response.data)
        : axiosErr.message ?? String(err);
    console.error("[sms] MSG91 OTP send threw:", {
      to: phone,
      status: axiosErr.response?.status ?? "no-status",
      error: msgText,
      request: loggablePayload,
    });
    return { ok: false, error: msgText };
  }
}

// ─── Generic transactional SMS (rarely used; kept for completeness) ─

/**
 * Non-OTP transactional SMS. Phase 1 doesn't call this. Real
 * implementation lands when transactional templates are needed
 * (Phase 5 payroll alerts).
 */
export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  if (!ENV.msg91AuthKey) {
    console.log("[sms:DEV]", { to: msg.to, body: msg.body });
    return { ok: true, id: "dev-stub" };
  }

  console.warn("[sms] sendSms (non-OTP) not implemented in shared-defaults mode; would have sent:", {
    to: msg.to,
    bodyPreview: msg.body.slice(0, 60),
  });
  return { ok: true, id: "stub-not-implemented" };
}

// ─── Helper for backwards compatibility with Prompt 3 ───────────────

export function otpSms(code: string, expiresInMin: number): string {
  return `Your Ember verification code is ${code}. It expires in ${expiresInMin} minutes.`;
}
