import { AlertTriangle } from "lucide-react";
import { labelForAnomaly } from "@/lib/anomalyLabels";

export interface AnomalyIndicatorProps {
  codes: string[];
  expanded?: boolean;
  onToggle?: () => void;
}

export function AnomalyIndicator({ codes, expanded, onToggle }: AnomalyIndicatorProps) {
  if (codes.length === 0) return null;
  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 border border-yellow-300 text-yellow-900 text-xs font-medium hover:bg-yellow-100"
        aria-expanded={expanded}
        aria-label={`${codes.length} anomalies`}
      >
        <AlertTriangle className="h-3 w-3" />
        {codes.length}
      </button>
      {expanded && (
        <ul className="mt-1 text-xs text-yellow-900 space-y-0.5 pl-1">
          {codes.map((c) => (
            <li key={c}>• {labelForAnomaly(c)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
