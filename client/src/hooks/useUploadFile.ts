import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type UploadKind =
  | "attendance" | "checklist" | "expense" | "inventory"
  | "breakage" | "document" | "profile_photo";

export interface UploadContext {
  personId?: string;
  propertyId?: string;
  expenseId?: string;
  inventoryItemId?: string;
  breakageId?: string;
  checklistSection?: string;
  checklistIndex?: number;
  breakageIndex?: number;
  documentType?:
    | "id_proof" | "address_proof" | "bank_proof"
    | "photo" | "training_certificate" | "other";
  fileExtension?: string;
}

export interface UploadResult {
  key: string;
  url?: string;
}

export function useUploadFile() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUploadUrl = trpc.upload.getUploadUrl.useMutation();
  const utils = trpc.useUtils();

  const upload = useCallback(async (
    file: File | Blob,
    kind: UploadKind,
    context: UploadContext
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const contentType = file.type || "application/octet-stream";
      const signed = await getUploadUrl.mutateAsync({
        kind,
        contentType,
        ...context,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.open("PUT", signed.url);
        Object.entries(signed.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.send(file);
      });

      const downloadResult = await utils.upload.getDownloadUrl.fetch({ key: signed.key });

      setProgress(100);
      return { key: signed.key, url: downloadResult?.url };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }, [getUploadUrl, utils]);

  const reset = useCallback(() => {
    setProgress(0);
    setUploading(false);
    setError(null);
  }, []);

  return { upload, uploading, progress, error, reset };
}
