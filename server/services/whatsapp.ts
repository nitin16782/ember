/**
 * MSG91 WhatsApp OTP sender.
 *
 * Why WhatsApp:
 *   - India's TRAI DLT mandate gates every SMS hitting Indian operators,
 *     including transactional/internal use. Without a registered DLT
 *     template + sender ID the carrier silently drops the message.
 *   - WhatsApp uses Meta's approval system (different process, no DLT
 *     required). Authentication-category templates are auto-approved
 *     by Meta in 1–4 hours and have no per-message DLT cost.
 *
 * Operator setup (one-time, ~1 hour):
 *   1. In MSG91 dashboard → WhatsApp → Manage Templates → New Template
 *      - Category: Authentication
 *      - Name: e.g. `ember_otp`
 *      - Language: e.g. `en` (or `en_US`)
 *      - Body: `{{1}} is your verification code.`
 *        (Meta requires exactly this minimal shape for the
 *         Authentication category)
 *   2. Submit. Meta usually approves Authentication templates
 *      in 1–4 hours.
 *   3. Set on Railway → Variables:
 *        MSG91_WA_INTEGRATED_NUMBER  = your WA Business number, digits-only
 *                                     (e.g. 919812345678)
 *        MSG91_WA_TEMPLATE_NAME       = ember_otp (or whatever you named it)
 *        MSG91_WA_TEMPLATE_LANG       = en   (or en_US — must match the
 *                                            language code MSG91 shows)
 *   4. Redeploy. requestOtp now routes through WhatsApp automatically;
 *      the SMS path stays as a fallback for accounts where WhatsApp
 *      isn't configured.
 */

import axios, { type AxiosInstance } from "axios";
import { ENV } from "../_core/env";
import { normalisePhone } from "./sms";

export interface WaOtpMessage {
  to: string;
  code: string;
}

export interface WaResult {
  ok: boolean;
  id?: string;
  error?: string;
  raw?: unknown;
}

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

/**
 * True when the operator has set all three WA env vars so we can
 * actually send. Auth router checks this to decide whether to route
 * an OTP through WhatsApp or fall back to SMS.
 */
export function isWhatsAppOtpConfigured(): boolean {
  return Boolean(
    ENV.msg91AuthKey &&
    ENV.msg91WaIntegratedNumber &&
    ENV.msg91WaTemplateName
  );
}

/**
 * Send an OTP code through MSG91's WhatsApp bulk-template endpoint.
 *
 * Falls back to console-log when MSG91_AUTH_KEY is missing (dev mode).
 *
 * Docs: https://docs.msg91.com/whatsapp/whatsapp-bulk-template
 */
export async function sendOtpWhatsApp(msg: WaOtpMessage): Promise<WaResult> {
  if (!ENV.msg91AuthKey) {
    console.log("[wa:DEV otp]", { to: msg.to, code: msg.code });
    return { ok: true, id: "dev-stub" };
  }
  if (!ENV.msg91WaIntegratedNumber || !ENV.msg91WaTemplateName) {
    return { ok: false, error: "WhatsApp not configured (missing MSG91_WA_* env vars)" };
  }

  const phone = normalisePhone(msg.to);

  const payload = {
    integrated_number: ENV.msg91WaIntegratedNumber,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: ENV.msg91WaTemplateName,
        language: {
          code: ENV.msg91WaTemplateLang || "en",
          policy: "deterministic",
        },
        namespace: null,
        to_and_components: [
          {
            to: [phone],
            components: {
              body_1: { type: "text", value: msg.code },
              // Authentication-category templates that include a "copy
              // code" button need a matching button payload. Most MSG91
              // accounts accept the button param under button_1; when
              // not needed it's harmless.
              button_1: { subtype: "url", type: "text", value: msg.code },
            },
          },
        ],
      },
    },
  } as const;

  // Mask the OTP in any log lines so leaked Railway logs aren't an
  // account-takeover vector.
  const loggablePayload = {
    ...payload,
    payload: {
      ...payload.payload,
      template: {
        ...payload.payload.template,
        to_and_components: [{ to: [phone], components: { body_1: "******", button_1: "******" } }],
      },
    },
  };

  try {
    const resp = await getClient().post(
      "/whatsapp/whatsapp-outbound-message/bulk/",
      payload,
      { headers: { authkey: ENV.msg91AuthKey } },
    );

    if (resp.data?.type === "success" || resp.status === 200) {
      const id = resp.data?.request_id ?? resp.data?.message ?? "ok";
      console.log("[wa] MSG91 WhatsApp OTP sent:", {
        to: phone,
        request_id: id,
        response: resp.data,
        request: loggablePayload,
      });
      return { ok: true, id: String(id), raw: resp.data };
    }

    const errMsg = resp.data?.message ?? "MSG91 returned non-success";
    console.error("[wa] MSG91 WhatsApp OTP send failed:", {
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
    console.error("[wa] MSG91 WhatsApp OTP send threw:", {
      to: phone,
      status: axiosErr.response?.status ?? "no-status",
      error: msgText,
      request: loggablePayload,
    });
    return { ok: false, error: msgText };
  }
}
