import { Resend } from "resend";
import { ENV } from "../_core/env";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!ENV.resendApiKey) return null;
  if (!_client) _client = new Resend(ENV.resendApiKey);
  return _client;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    console.log("[email:DEV]", { to: msg.to, subject: msg.subject });
    console.log("[email:DEV body]", msg.text ?? msg.html.replace(/<[^>]+>/g, ""));
    return { ok: true, id: "dev-stub" };
  }

  try {
    const result = await client.emails.send({
      from: `${ENV.resendFromName} <${ENV.resendFromEmail}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true, id: result.data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Templates ──────────────────────────────────────────────────────

export function magicLinkEmail(name: string, url: string, expiresInMin: number): { subject: string; html: string; text: string } {
  return {
    subject: "Your Ember sign-in link",
    text: `Hi ${name},\n\nClick the link below to sign in to Ember. It expires in ${expiresInMin} minutes.\n\n${url}\n\nIf you didn't request this, you can ignore this email.\n\n— Firebrick`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:24px;color:#1A1A1A">
      <h2 style="font-family:Georgia,serif;color:#1A3A5C;margin:0 0 16px">Sign in to Ember</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to sign in. The link expires in ${expiresInMin} minutes.</p>
      <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#1A3A5C;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px">Sign in to Ember</a></p>
      <p style="color:#5C5C5C;font-size:14px">If you didn't request this, you can ignore this email.</p>
      <hr style="border:none;border-top:1px solid #D9D2C2;margin:24px 0">
      <p style="color:#5C5C5C;font-size:12px">Firebrick · A vertical of Pinch Lifestyle Services</p>
    </body></html>`,
  };
}

export function otpEmail(name: string, code: string, expiresInMin: number): { subject: string; html: string; text: string } {
  return {
    subject: `Your Ember verification code: ${code}`,
    text: `Hi ${name},\n\nYour verification code is: ${code}\n\nIt expires in ${expiresInMin} minutes.\n\n— Firebrick`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:24px;color:#1A1A1A">
      <h2 style="font-family:Georgia,serif;color:#1A3A5C;margin:0 0 16px">Your verification code</h2>
      <p>Hi ${name},</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1A3A5C;font-family:Consolas,monospace;margin:24px 0">${code}</p>
      <p>This code expires in ${expiresInMin} minutes.</p>
      <p style="color:#5C5C5C;font-size:14px">If you didn't request this, please ignore this email.</p>
      <hr style="border:none;border-top:1px solid #D9D2C2;margin:24px 0">
      <p style="color:#5C5C5C;font-size:12px">Firebrick · A vertical of Pinch Lifestyle Services</p>
    </body></html>`,
  };
}
