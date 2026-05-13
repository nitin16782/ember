import { ENV } from "../_core/env";

export interface SmsMessage {
  to: string;
  body: string;
  templateId?: string;
  templateVars?: Record<string, string>;
}

// MSG91 implementation comes in Prompt 4. For now: console-log stub
// so OTP flows are testable without provider plumbing.
export async function sendSms(msg: SmsMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!ENV.msg91AuthKey) {
    console.log("[sms:DEV]", { to: msg.to, body: msg.body });
    return { ok: true, id: "dev-stub" };
  }
  console.log("[sms:STUB] MSG91 not yet wired (Prompt 4)", { to: msg.to });
  return { ok: true, id: "stub" };
}

export function otpSms(code: string, expiresInMin: number): string {
  return `Your Ember verification code is ${code}. It expires in ${expiresInMin} minutes. — Firebrick`;
}
