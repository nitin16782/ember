/**
 * ═══════════════════════════════════════════════════════════════════════
 * Media Service — Cloudflare R2 (S3-compatible)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Bucket layout (env = "dev" | "staging" | "prod"):
 *
 *   ember/{env}/attendance/{YYYY-MM}/{person_id}/{timestamp}.jpg
 *   ember/{env}/checklists/{property_id}/{YYYY-MM-DD}/{section}/{n}.jpg
 *   ember/{env}/expenses/{property_id}/{YYYY-MM}/{expense_id}/bill.jpg
 *   ember/{env}/inventory/{property_id}/{item_id}/{photo_id}.jpg
 *   ember/{env}/breakages/{property_id}/{YYYY-MM}/{breakage_id}/{n}.jpg
 *   ember/{env}/contracts/drafts/{contract_id}.{ext}
 *   ember/{env}/contracts/signed/{contract_id}.pdf
 *   ember/{env}/payslips/{YYYY-MM}/{person_id}/payslip.pdf
 *   ember/{env}/reports/{property_id}/{YYYY-MM}/report.pdf
 *   ember/{env}/id-cards/{person_id}/card.pdf
 *   ember/{env}/documents/{person_id}/{document_type}/{file_id}
 *   ember/{env}/profile-photos/{person_id}.jpg
 *
 * Browser-direct uploads (preferred): server signs a PUT URL; browser
 * uploads bytes directly to R2.
 *
 * Server-side uploads: used for PDF generation outputs etc., where the
 * bytes are already on the server.
 */

import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { ENV } from "../_core/env";

// ─── R2 client (lazy-init, S3-compatible) ───────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!ENV.r2AccountId || !ENV.r2AccessKeyId || !ENV.r2SecretAccessKey) {
    return null;
  }
  if (!_client) {
    _client = new S3Client({
      region: "auto", // R2 ignores region; "auto" is the convention
      endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ENV.r2AccessKeyId,
        secretAccessKey: ENV.r2SecretAccessKey,
      },
      forcePathStyle: false,
    });
  }
  return _client;
}

// ─── Path builders ──────────────────────────────────────────────────

function env(): string {
  if (ENV.nodeEnv === "production") return "prod";
  if (ENV.nodeEnv === "staging") return "staging";
  return "dev";
}

function ymd(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10); // 2026-05-13
}

function ym(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7); // 2026-05
}

export const paths = {
  attendance: (personId: string, date: Date = new Date()): string =>
    `ember/${env()}/attendance/${ym(date)}/${personId}/${Date.now()}.jpg`,

  checklist: (propertyId: string, section: string, n: number, date: Date = new Date()): string =>
    `ember/${env()}/checklists/${propertyId}/${ymd(date)}/${section}/${n}.jpg`,

  expense: (propertyId: string, expenseId: string, date: Date = new Date()): string =>
    `ember/${env()}/expenses/${propertyId}/${ym(date)}/${expenseId}/bill.jpg`,

  inventory: (propertyId: string, itemId: string, photoId: string = randomUUID()): string =>
    `ember/${env()}/inventory/${propertyId}/${itemId}/${photoId}.jpg`,

  breakage: (propertyId: string, breakageId: string, n: number, date: Date = new Date()): string =>
    `ember/${env()}/breakages/${propertyId}/${ym(date)}/${breakageId}/${n}.jpg`,

  contractDraft: (contractId: string, ext: string = "pdf"): string =>
    `ember/${env()}/contracts/drafts/${contractId}.${ext}`,

  contractSigned: (contractId: string): string =>
    `ember/${env()}/contracts/signed/${contractId}.pdf`,

  payslip: (personId: string, cycle: string): string =>
    `ember/${env()}/payslips/${cycle}/${personId}/payslip.pdf`,

  report: (propertyId: string, month: string): string =>
    `ember/${env()}/reports/${propertyId}/${month}/report.pdf`,

  idCard: (personId: string): string =>
    `ember/${env()}/id-cards/${personId}/card.pdf`,

  document: (personId: string, documentType: string, fileId: string = randomUUID()): string =>
    `ember/${env()}/documents/${personId}/${documentType}/${fileId}`,

  profilePhoto: (personId: string): string =>
    `ember/${env()}/profile-photos/${personId}.jpg`,
};

// ─── Upload (server-side) ───────────────────────────────────────────

export interface UploadInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  ok: boolean;
  key: string;
  error?: string;
}

/**
 * Upload bytes to R2 from the server. Used for generated artifacts
 * (PDFs, server-rendered HTML, etc.). For client uploads use
 * `getUploadUrl` and have the browser PUT directly to R2.
 */
export async function uploadObject(input: UploadInput): Promise<UploadResult> {
  const client = getClient();
  if (!client) {
    console.warn("[r2] credentials missing; upload skipped");
    return { ok: false, key: input.key, error: "R2 not configured" };
  }

  try {
    await client.send(new PutObjectCommand({
      Bucket: ENV.r2Bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "private, max-age=86400",
      Metadata: input.metadata,
    }));
    return { ok: true, key: input.key };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[r2] upload failed:", input.key, msg);
    return { ok: false, key: input.key, error: msg };
  }
}

// ─── Signed download URL (for serving private objects) ──────────────

export interface SignedUrlOptions {
  /** Seconds until URL expires. Default 900 = 15 min. */
  expiresIn?: number;
}

export async function getDownloadUrl(key: string, opts: SignedUrlOptions = {}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: ENV.r2Bucket, Key: key }),
      { expiresIn: opts.expiresIn ?? 900 }
    );
    return url;
  } catch (err) {
    console.error("[r2] getDownloadUrl failed:", key, err);
    return null;
  }
}

// ─── Signed upload URL (for browser-direct uploads) ─────────────────

export interface UploadUrlInput {
  key: string;
  contentType: string;
  /** Max bytes the upload can be. Default 10MB. */
  maxSizeBytes?: number;
  /** Seconds until URL expires. Default 600 = 10 min. */
  expiresIn?: number;
}

export interface UploadUrlResult {
  url: string;
  key: string;
  expiresIn: number;
  headers: Record<string, string>;
}

/**
 * Generate a presigned URL that the browser PUTs bytes to directly.
 * Bytes never touch the Node server.
 *
 * Client usage:
 *   const { url, headers } = await trpc.upload.getUploadUrl.mutate(...);
 *   await fetch(url, { method: 'PUT', body: file, headers });
 */
export async function getUploadUrl(input: UploadUrlInput): Promise<UploadUrlResult | null> {
  const client = getClient();
  if (!client) return null;

  const expiresIn = input.expiresIn ?? 600;

  try {
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: ENV.r2Bucket,
        Key: input.key,
        ContentType: input.contentType,
      }),
      { expiresIn }
    );
    return {
      url,
      key: input.key,
      expiresIn,
      headers: { "Content-Type": input.contentType },
    };
  } catch (err) {
    console.error("[r2] getUploadUrl failed:", input.key, err);
    return null;
  }
}

// ─── Existence check ────────────────────────────────────────────────

export async function objectExists(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    await client.send(new HeadObjectCommand({ Bucket: ENV.r2Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ─── Delete ─────────────────────────────────────────────────────────

export async function deleteObject(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    await client.send(new DeleteObjectCommand({ Bucket: ENV.r2Bucket, Key: key }));
    return true;
  } catch (err) {
    console.error("[r2] deleteObject failed:", key, err);
    return false;
  }
}

// ─── Bulk signing for list endpoints ────────────────────────────────

/**
 * Wrap each item with a signed download URL. Use sparingly — every call
 * costs one R2 sign operation. Cache aggressively on list endpoints.
 */
export async function withSignedUrls<T extends { key: string }>(
  items: T[],
  opts: SignedUrlOptions = {}
): Promise<Array<T & { url: string | null }>> {
  return Promise.all(items.map(async (item) => ({
    ...item,
    url: await getDownloadUrl(item.key, opts),
  })));
}

// ─── Validation helper (kept for routes that still accept bytes) ────

export function validateUpload(
  data: Buffer | Uint8Array,
  mimeType: string,
  maxSizeMB: number = 10
): string | null {
  const sizeMB = data.length / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return `File size ${sizeMB.toFixed(1)}MB exceeds maximum ${maxSizeMB}MB`;
  }

  const allowedTypes = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/html",
  ];

  if (!allowedTypes.includes(mimeType)) {
    return `File type ${mimeType} is not supported. Allowed: JPEG, PNG, WebP, GIF, PDF, DOCX, XLSX, HTML`;
  }

  return null;
}
