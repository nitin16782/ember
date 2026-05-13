export interface SignedUploadResult {
  key: string;
  url: string;
  headers: Record<string, string>;
}

export interface UploadSelfieDeps {
  getUploadUrl: (input: {
    kind: "attendance";
    contentType: string;
    personId: string;
    fileExtension?: string;
  }) => Promise<SignedUploadResult>;
  confirmUpload: (input: { key: string }) => Promise<{ exists: boolean }>;
  fetchImpl?: typeof fetch;
}

export interface UploadSelfieInput {
  blob: Blob;
  personId: string;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

export class SelfieUploadError extends Error {
  constructor(
    message: string,
    public readonly stage: "sign" | "put" | "confirm" | "missing"
  ) {
    super(message);
    this.name = "SelfieUploadError";
  }
}

export async function uploadSelfie(
  input: UploadSelfieInput,
  deps: UploadSelfieDeps
): Promise<{ key: string }> {
  const { blob, personId, signal, onProgress } = input;
  const fetchImpl = deps.fetchImpl ?? fetch;

  let signed: SignedUploadResult;
  try {
    signed = await deps.getUploadUrl({
      kind: "attendance",
      contentType: blob.type || "image/jpeg",
      personId,
      fileExtension: "jpg",
    });
  } catch (err) {
    throw new SelfieUploadError(
      err instanceof Error ? err.message : "Failed to sign upload",
      "sign"
    );
  }

  if (signal?.aborted) {
    throw new SelfieUploadError("Upload aborted", "put");
  }

  onProgress?.(10);

  let putResp: Response;
  try {
    putResp = await fetchImpl(signed.url, {
      method: "PUT",
      body: blob,
      headers: signed.headers,
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new SelfieUploadError("Upload aborted", "put");
    }
    throw new SelfieUploadError(
      err instanceof Error ? err.message : "Upload PUT failed",
      "put"
    );
  }

  if (!putResp.ok) {
    throw new SelfieUploadError(
      `Upload PUT failed with status ${putResp.status}`,
      "put"
    );
  }

  onProgress?.(80);

  let confirmation: { exists: boolean };
  try {
    confirmation = await deps.confirmUpload({ key: signed.key });
  } catch (err) {
    throw new SelfieUploadError(
      err instanceof Error ? err.message : "Failed to confirm upload",
      "confirm"
    );
  }

  if (!confirmation.exists) {
    throw new SelfieUploadError("Server could not find uploaded object", "missing");
  }

  onProgress?.(100);
  return { key: signed.key };
}
