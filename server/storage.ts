// Storage surface for module services. The real backend (Cloudflare R2)
// is wired up in Prompt 6. Until then, any actual upload attempt throws.

function notImplemented(): never {
  throw new Error("Storage not yet implemented (Prompt 6: Cloudflare R2)");
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  _relKey: string,
  _data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  notImplemented();
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${key}` };
}

export async function storageGetSignedUrl(_relKey: string): Promise<string> {
  notImplemented();
}
