import { useEffect, useState } from "react";
import { Camera, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";

type Status = "unknown" | "granted" | "denied" | "prompt";

export interface PermissionsCheckProps {
  onAllGranted?: () => void;
}

async function queryPermission(name: "camera" | "geolocation"): Promise<Status> {
  if (typeof navigator === "undefined" || !navigator.permissions) {
    return "unknown";
  }
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    if (result.state === "granted") return "granted";
    if (result.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}

async function requestCamera(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

function requestGeolocation(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(false);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 8000, maximumAge: 60_000, enableHighAccuracy: true }
    );
  });
}

export function PermissionsCheck({ onAllGranted }: PermissionsCheckProps) {
  const [camera, setCamera] = useState<Status>("unknown");
  const [geo, setGeo] = useState<Status>("unknown");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([queryPermission("camera"), queryPermission("geolocation")]).then(([c, g]) => {
      if (cancelled) return;
      setCamera(c);
      setGeo(g);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (camera === "granted" && geo === "granted") onAllGranted?.();
  }, [camera, geo, onAllGranted]);

  if (camera === "granted" && geo === "granted") return null;

  async function grantAccess() {
    setRequesting(true);
    try {
      const cameraOk = await requestCamera();
      setCamera(cameraOk ? "granted" : "denied");
      const geoOk = await requestGeolocation();
      setGeo(geoOk ? "granted" : "denied");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#D9D2C2] bg-white p-4 mb-4">
      <h3 className="font-['Georgia',serif] text-lg text-[#1A3A5C] mb-2">Quick setup</h3>
      <p className="text-sm text-[#5C5C5C] mb-4">
        Two permissions let you mark attendance quickly:
      </p>
      <ul className="space-y-2 mb-4">
        <PermissionRow icon={Camera} label="Camera" status={camera} reason="For the selfie that confirms it's you" />
        <PermissionRow icon={MapPin} label="Location" status={geo} reason="So your supervisor knows you're at the property" />
      </ul>
      {(camera === "denied" || geo === "denied") && (
        <p className="text-xs text-[#7A5C0F] mb-3">
          If you blocked these before, open Settings → Site Settings to re-enable.
        </p>
      )}
      <button
        onClick={grantAccess}
        disabled={requesting}
        className="w-full min-h-[56px] rounded-lg bg-[#1A3A5C] text-white font-medium disabled:opacity-60"
      >
        {requesting ? "Asking..." : "Grant access"}
      </button>
    </div>
  );
}

function PermissionRow({
  icon: Icon,
  label,
  status,
  reason,
}: {
  icon: typeof Camera;
  label: string;
  status: Status;
  reason: string;
}) {
  const indicator =
    status === "granted" ? (
      <CheckCircle2 className="h-4 w-4 text-green-700" />
    ) : status === "denied" ? (
      <AlertCircle className="h-4 w-4 text-red-700" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-[#7A5C0F] block" />
    );

  return (
    <li className="flex items-center gap-3 text-sm">
      <Icon className="h-5 w-5 text-[#1A3A5C] flex-shrink-0" />
      <div className="flex-1">
        <div className="text-[#1A1A1A]">{label}</div>
        <div className="text-xs text-[#5C5C5C]">{reason}</div>
      </div>
      <div className="flex-shrink-0">{indicator}</div>
    </li>
  );
}
