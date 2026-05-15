import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { trpc } from "@/lib/trpc";
import { Camera, MapPin, X, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { uploadSelfie, SelfieUploadError } from "./lib/uploadSelfie";
import type { ShiftEventType } from "./lib/offlineQueue";
import { queueMark } from "./lib/offlineQueue";
import { useAssociateLocale, type AssociateStrings } from "@/lib/i18n/associate";

export interface MarkSequenceProps {
  eventType: ShiftEventType;
  primaryLabel: string;
  personId: string;
  onClose: () => void;
  onSuccess: () => void;
  onQueued?: () => void;
}

type GeoState =
  | { kind: "idle" }
  | { kind: "acquiring" }
  | { kind: "acquired"; lat: number; lng: number; accuracy: number }
  | { kind: "failed"; reason: string };

type Stage = "setup" | "ready" | "uploading" | "submitting" | "done" | "error";

const TARGET_DIM = 400;
const JPEG_QUALITY = 0.7;

export function MarkSequence({
  eventType,
  primaryLabel,
  personId,
  onClose,
  onSuccess,
  onQueued,
}: MarkSequenceProps) {
  const { t } = useAssociateLocale();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Blob | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoState>({ kind: "idle" });
  const [stage, setStage] = useState<Stage>("setup");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const getUploadUrl = trpc.upload.getUploadUrl.useMutation();
  const confirmUpload = trpc.upload.confirmUpload.useMutation();
  const markEvent = trpc.attendance.markEvent.useMutation();

  // ─── Camera ──────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.markCameraUnavailable);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 800 }, height: { ideal: 800 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
    } catch (e) {
      const err = e as Error;
      if (err.name === "NotAllowedError") {
        setCameraError(t.markCameraDenied);
      } else if (err.name === "NotFoundError") {
        setCameraError(t.markCameraNotFound);
      } else {
        setCameraError(err.message || t.markCameraGenericError);
      }
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ─── Geolocation (parallel) ─────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ kind: "failed", reason: t.markGeoUnavailable });
      return;
    }
    setGeo({ kind: "acquiring" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          kind: "acquired",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGeo({
          kind: "failed",
          reason: err.code === err.PERMISSION_DENIED ? t.markGeoDenied : t.markGeoUnknown,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
    // The reason strings need to be live but we don't want to retry geolocation
    // on every locale change; t is captured at mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Snapshot ───────────────────────────────────────────────────
  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_DIM;
    canvas.height = TARGET_DIM;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, TARGET_DIM, TARGET_DIM);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return;
    setSnapshot(blob);
    setSnapshotPreview(URL.createObjectURL(blob));
    setStage("ready");
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    if (snapshotPreview) URL.revokeObjectURL(snapshotPreview);
    setSnapshot(null);
    setSnapshotPreview(null);
    setStage("setup");
    startCamera();
  }, [snapshotPreview, startCamera]);

  // ─── Submit ─────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!snapshot) return;
    setSubmitError(null);
    setStage("uploading");
    setProgress(5);

    let selfieKey: string | undefined;
    try {
      const result = await uploadSelfie(
        { blob: snapshot, personId, onProgress: setProgress },
        {
          getUploadUrl: (input) => getUploadUrl.mutateAsync(input),
          confirmUpload: (input) => confirmUpload.mutateAsync(input),
        }
      );
      selfieKey = result.key;
    } catch (e) {
      const stage = e instanceof SelfieUploadError ? e.stage : "unknown";
      setSubmitError(t.markUploadFailed(stage));
      setStage("error");
      return;
    }

    setStage("submitting");
    const coords = geo.kind === "acquired" ? { latitude: geo.lat, longitude: geo.lng } : {};

    try {
      await markEvent.mutateAsync({
        eventType,
        eventAt: new Date().toISOString(),
        selfieKey,
        ...coords,
      });
      setStage("done");
      setTimeout(() => {
        onSuccess();
      }, 350);
    } catch (e) {
      const err = e as { message?: string; data?: { code?: string } };
      const code = err.data?.code;

      if (code === "INTERNAL_SERVER_ERROR" || /network|fetch|timeout/i.test(err.message ?? "")) {
        queueMark({
          eventType,
          eventAt: new Date().toISOString(),
          selfieKey,
          ...coords,
        });
        setSubmitError(t.markQueuedOffline);
        setStage("error");
        onQueued?.();
        return;
      }
      setSubmitError(err.message ?? t.markEventError);
      setStage("error");
    }
  }, [snapshot, personId, geo, eventType, getUploadUrl, confirmUpload, markEvent, onSuccess, onQueued, t]);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#F7F3EE] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-['Georgia',serif] text-xl text-[#1A3A5C]">{primaryLabel}</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#5C5C5C]"
            aria-label={t.markCancelAria}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <section className="rounded-lg overflow-hidden bg-black aspect-square relative">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center bg-[#1A3A5C]">
              <Camera className="h-10 w-10 mb-2 opacity-60" />
              <p className="text-sm mb-3">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-white text-[#1A3A5C] rounded font-medium"
              >
                {t.markRetryCamera}
              </button>
            </div>
          ) : snapshotPreview ? (
            <img src={snapshotPreview} alt="Captured selfie" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </section>

        {!snapshot && !cameraError ? (
          <button
            onClick={capture}
            className="w-full min-h-[56px] rounded-lg bg-[#1A3A5C] text-white font-medium flex items-center justify-center gap-2"
          >
            <Camera className="h-5 w-5" />
            {t.markCapture}
          </button>
        ) : null}

        {snapshot ? (
          <button
            onClick={retake}
            disabled={stage === "uploading" || stage === "submitting"}
            className="w-full min-h-[44px] rounded-lg border border-[#D9D2C2] bg-white text-[#1A3A5C] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {t.markRetake}
          </button>
        ) : null}

        <section className="rounded-lg border border-[#D9D2C2] bg-white p-3 flex items-center gap-3">
          <MapPin className="h-5 w-5 text-[#1A3A5C] flex-shrink-0" />
          <div className="flex-1 text-sm">{renderGeoText(geo, t)}</div>
          <div className="flex-shrink-0">{renderGeoDot(geo)}</div>
        </section>

        {stage === "uploading" || stage === "submitting" ? (
          <div className="rounded-lg bg-white border border-[#D9D2C2] p-3">
            <div className="flex items-center gap-2 text-sm text-[#1A3A5C] mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {stage === "uploading" ? t.markUploading : t.markRecording}
            </div>
            <div className="h-2 rounded-full bg-[#F7F3EE] overflow-hidden">
              <div
                className="h-full bg-[#1A3A5C] transition-all"
                style={{ width: `${stage === "submitting" ? 100 : progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {stage === "done" ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle2 className="h-5 w-5" /> {t.markDone}
          </div>
        ) : null}

        {submitError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {submitError}
          </div>
        ) : null}

        <button
          onClick={submit}
          disabled={!snapshot || stage === "uploading" || stage === "submitting" || stage === "done"}
          className="w-full min-h-[56px] rounded-lg bg-[#7A5C0F] text-white font-medium disabled:opacity-50"
        >
          {stage === "error" ? t.retry : t.markConfirm(primaryLabel)}
        </button>
      </div>
    </div>
  );
}

function renderGeoText(geo: GeoState, t: AssociateStrings): string {
  switch (geo.kind) {
    case "idle":
      return t.markGeoIdle;
    case "acquiring":
      return t.markGeoAcquiring;
    case "acquired":
      return geo.accuracy <= 50
        ? t.markGeoReady(Math.round(geo.accuracy))
        : t.markGeoApproximate(Math.round(geo.accuracy));
    case "failed":
      return t.markGeoFailedNoCoords(geo.reason);
  }
}

function renderGeoDot(geo: GeoState): ReactElement {
  if (geo.kind === "acquired") {
    const color = geo.accuracy <= 50 ? "bg-green-600" : "bg-yellow-500";
    return <span className={`block h-3 w-3 rounded-full ${color}`} />;
  }
  if (geo.kind === "failed") {
    return <span className="block h-3 w-3 rounded-full bg-red-500" />;
  }
  return <Loader2 className="h-4 w-4 animate-spin text-[#5C5C5C]" />;
}
