/**
 * ═══════════════════════════════════════════════════════════════════════
 * Media Upload Service — Module-Specific File Storage
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This module provides structured file upload helpers for each Ember module.
 * Files are stored via the platform S3 helpers (storagePut/storageGet).
 *
 * Bucket path structure:
 *   ember/{module}/{entityId}/{filename}
 *
 * Supported modules:
 *   - attendance: selfie photos for GPS+selfie verification
 *   - expenses: receipt images and supporting documents
 *   - breakages: breakage evidence photos
 *   - contracts: signed contract PDFs
 *   - idcards: ID card photos
 *   - properties: property images
 *   - dailyops: checklist evidence photos
 *   - people: profile photos and identity documents
 */

import { storagePut } from "../storage";

export type MediaModule =
  | "attendance"
  | "expenses"
  | "breakages"
  | "contracts"
  | "idcards"
  | "properties"
  | "dailyops"
  | "people";

export interface UploadResult {
  key: string;
  url: string;
  module: MediaModule;
  entityId: string;
  filename: string;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Upload a file for a specific module and entity.
 * Returns the storage key and URL for database persistence.
 */
export async function uploadModuleFile(
  module: MediaModule,
  entityId: string | number,
  filename: string,
  data: Buffer | Uint8Array | string,
  mimeType: string
): Promise<UploadResult> {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const key = `ember/${module}/${entityId}/${timestamp}-${sanitizedFilename}`;

  const { key: storedKey, url } = await storagePut(key, data, mimeType);

  return {
    key: storedKey,
    url,
    module,
    entityId: String(entityId),
    filename: sanitizedFilename,
    mimeType,
    uploadedAt: new Date(),
  };
}

/**
 * Get the expected bucket path for a module's files.
 * Useful for listing or cleaning up files.
 */
export function getModulePath(module: MediaModule, entityId?: string | number): string {
  return entityId ? `ember/${module}/${entityId}/` : `ember/${module}/`;
}

/**
 * Validate file size and type for upload.
 * Returns null if valid, or an error message if invalid.
 */
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
  ];

  if (!allowedTypes.includes(mimeType)) {
    return `File type ${mimeType} is not supported. Allowed: JPEG, PNG, WebP, GIF, PDF, DOCX, XLSX`;
  }

  return null;
}
