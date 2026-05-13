import { describe, it, expect, vi } from "vitest";
import { uploadSelfie, SelfieUploadError, type UploadSelfieDeps } from "./uploadSelfie";

function makeBlob(bytes = 100): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
}

function makeDeps(overrides: Partial<UploadSelfieDeps> = {}): UploadSelfieDeps {
  return {
    getUploadUrl: vi.fn().mockResolvedValue({
      key: "ember/dev/attendance/2026-05/person-1/123.jpg",
      url: "https://r2.example.com/signed",
      headers: { "Content-Type": "image/jpeg" },
    }),
    confirmUpload: vi.fn().mockResolvedValue({ exists: true }),
    fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response),
    ...overrides,
  };
}

describe("uploadSelfie", () => {
  it("chains getUploadUrl → PUT → confirmUpload and returns the key", async () => {
    const deps = makeDeps();
    const result = await uploadSelfie({ blob: makeBlob(), personId: "p-1" }, deps);

    expect(deps.getUploadUrl).toHaveBeenCalledWith({
      kind: "attendance",
      contentType: "image/jpeg",
      personId: "p-1",
      fileExtension: "jpg",
    });
    expect(deps.fetchImpl).toHaveBeenCalledWith(
      "https://r2.example.com/signed",
      expect.objectContaining({ method: "PUT" })
    );
    expect(deps.confirmUpload).toHaveBeenCalledWith({
      key: "ember/dev/attendance/2026-05/person-1/123.jpg",
    });
    expect(result.key).toBe("ember/dev/attendance/2026-05/person-1/123.jpg");
  });

  it("reports progress at sign, after PUT, and after confirm", async () => {
    const onProgress = vi.fn();
    await uploadSelfie({ blob: makeBlob(), personId: "p-1", onProgress }, makeDeps());
    const progressValues = onProgress.mock.calls.map((c) => c[0]);
    expect(progressValues).toContain(10);
    expect(progressValues).toContain(80);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  it("throws SelfieUploadError at 'sign' stage when getUploadUrl fails", async () => {
    const deps = makeDeps({
      getUploadUrl: vi.fn().mockRejectedValue(new Error("trpc down")),
    });
    await expect(uploadSelfie({ blob: makeBlob(), personId: "p-1" }, deps)).rejects.toBeInstanceOf(
      SelfieUploadError
    );
    try {
      await uploadSelfie({ blob: makeBlob(), personId: "p-1" }, deps);
    } catch (e) {
      expect((e as SelfieUploadError).stage).toBe("sign");
    }
  });

  it("throws SelfieUploadError at 'put' stage when fetch rejects", async () => {
    const deps = makeDeps({
      fetchImpl: vi.fn().mockRejectedValue(new Error("network down")),
    });
    try {
      await uploadSelfie({ blob: makeBlob(), personId: "p-1" }, deps);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as SelfieUploadError).stage).toBe("put");
    }
  });

  it("throws SelfieUploadError at 'put' stage on non-2xx HTTP", async () => {
    const deps = makeDeps({
      fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response),
    });
    try {
      await uploadSelfie({ blob: makeBlob(), personId: "p-1" }, deps);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as SelfieUploadError).stage).toBe("put");
      expect((e as SelfieUploadError).message).toMatch(/500/);
    }
  });

  it("throws SelfieUploadError at 'missing' stage when confirm returns exists=false", async () => {
    const deps = makeDeps({
      confirmUpload: vi.fn().mockResolvedValue({ exists: false }),
    });
    try {
      await uploadSelfie({ blob: makeBlob(), personId: "p-1" }, deps);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as SelfieUploadError).stage).toBe("missing");
    }
  });

  it("honors AbortSignal cancellation between sign and PUT", async () => {
    const ac = new AbortController();
    ac.abort();
    const deps = makeDeps();
    try {
      await uploadSelfie({ blob: makeBlob(), personId: "p-1", signal: ac.signal }, deps);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as SelfieUploadError).stage).toBe("put");
      expect((e as SelfieUploadError).message).toMatch(/aborted/i);
    }
  });

  it("propagates the blob's contentType (falls back to image/jpeg if missing)", async () => {
    const deps = makeDeps();
    const blobWithoutType = new Blob([new Uint8Array(10)]);
    await uploadSelfie({ blob: blobWithoutType, personId: "p-1" }, deps);
    expect(deps.getUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "image/jpeg" })
    );
  });
});
