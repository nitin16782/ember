import { useMemo, useState } from "react";
import { Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

const AUDIT_ROLES = ["ops_lead", "central_admin", "super_admin"];

const ACTION_LABELS: Record<string, string> = {
  mark_event: "Mark event",
  mark_event_on_behalf: "Mark on behalf",
  request_edit: "Request edit",
  approve_edit: "Approve edit",
  reject_edit: "Reject edit",
  manual_summary_recompute: "Recompute summary",
  lock_summary: "Lock summary",
};

function istDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function shiftDate(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface AuditEntry {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorRole: string;
  action: string;
  targetPersonId: string | null;
  targetPersonName: string | null;
  targetEventId: string | null;
  targetEditRequestId: string | null;
  payload: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

function describePayload(entry: AuditEntry): string {
  const p = entry.payload as Record<string, unknown> | null | undefined;
  try {
    switch (entry.action) {
      case "mark_event": {
        const eventType = p?.eventType as string | undefined;
        const eventAt = p?.eventAt as string | undefined;
        const within = p?.withinGeofence as boolean | null | undefined;
        const time = eventAt ? formatLocal(eventAt) : "";
        const fence =
          within === true ? "within geofence" : within === false ? "outside geofence" : "no GPS";
        return `${eventType ?? "event"} at ${time}, ${fence}`;
      }
      case "mark_event_on_behalf": {
        const eventType = p?.eventType as string | undefined;
        const eventAt = p?.eventAt as string | undefined;
        const reason = p?.reason as string | undefined;
        return `${eventType ?? "event"} at ${eventAt ? formatLocal(eventAt) : "—"}${reason ? ` · "${reason}"` : ""}`;
      }
      case "request_edit": {
        const oldAt = p?.oldEventAt as string | undefined;
        const newAt = p?.newEventAt as string | undefined;
        const reason = p?.reason as string | undefined;
        const auto = p?.autoApproved as boolean | undefined;
        const path = auto ? "auto-approved" : "pending supervisor";
        return `${oldAt ? formatLocal(oldAt) : "?"} → ${newAt ? formatLocal(newAt) : "?"} (${path})${reason ? ` · "${reason}"` : ""}`;
      }
      case "approve_edit":
      case "reject_edit": {
        const newAt = p?.newEventAt as string | undefined;
        const note = p?.reviewNote as string | undefined;
        return `${newAt ? formatLocal(newAt) : "—"}${note ? ` · note: "${note}"` : ""}`;
      }
      default:
        return p ? JSON.stringify(p) : "—";
    }
  } catch {
    return "[See raw payload]";
  }
}

export default function AuditLog() {
  const { user } = useAuth();

  if (user && !AUDIT_ROLES.includes(user.role)) {
    if (user.role === "associate") return <Redirect to="/associate/attendance" />;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Audit log is restricted to ops leads and admins.
      </div>
    );
  }

  const today = istDateString();
  const [fromDate, setFromDate] = useState(shiftDate(today, -6));
  const [toDate, setToDate] = useState(today);
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const log = trpc.attendance.auditLog.useQuery(
    {
      fromDate,
      toDate,
      action: actionFilter as any,
      limit: 200,
    },
    { placeholderData: (prev) => prev }
  );

  const entries = (log.data?.entries ?? []) as AuditEntry[];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) c[e.action] = (c[e.action] ?? 0) + 1;
    return c;
  }, [entries]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-['Georgia',serif] text-2xl text-[#1A3A5C]">Audit log</h1>
          <p className="text-sm text-[#5C5C5C]">
            All attendance actions taken by staff. {entries.length} entries shown.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-[#D9D2C2] bg-white p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-[#5C5C5C] block mb-1">
            From
          </label>
          <Input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-[#5C5C5C] block mb-1">To</label>
          <Input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-[#5C5C5C] block mb-1">Action</label>
          <Select
            value={actionFilter ?? "all"}
            onValueChange={(v) => setActionFilter(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="min-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                  {counts[k] ? ` (${counts[k]})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="rounded-lg border border-[#D9D2C2] bg-white overflow-hidden">
        {log.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1A3A5C]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-sm text-center text-[#5C5C5C]">
            No audit entries for this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F3EE] text-[#1A3A5C]">
                <tr className="text-left">
                  <Th>Time</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D4]">
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="hover:bg-[#F9F5EC] cursor-pointer"
                  >
                    <Td className="tabular-nums text-xs">{formatLocal(e.createdAt)}</Td>
                    <Td>
                      <div className="text-[#1A1A1A]">{e.actorName ?? "—"}</div>
                      <div className="text-xs text-[#5C5C5C]">{e.actorRole}</div>
                    </Td>
                    <Td>{ACTION_LABELS[e.action] ?? e.action}</Td>
                    <Td>{e.targetPersonName ?? "—"}</Td>
                    <Td className="text-xs text-[#5C5C5C]">{describePayload(e)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-y-0 right-0 z-40 w-full md:w-[420px] bg-white border-l border-[#D9D2C2] shadow-xl overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-[#D9D2C2] p-4 flex items-center justify-between">
            <div>
              <h2 className="font-['Georgia',serif] text-lg text-[#1A3A5C]">
                {ACTION_LABELS[selected.action] ?? selected.action}
              </h2>
              <div className="text-xs text-[#5C5C5C]">{formatLocal(selected.createdAt)}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <Detail label="Actor" value={`${selected.actorName ?? "—"} (${selected.actorRole})`} />
            <Detail label="Target person" value={selected.targetPersonName ?? "—"} />
            <Detail label="Event" value={selected.targetEventId ?? "—"} mono />
            <Detail label="Edit request" value={selected.targetEditRequestId ?? "—"} mono />
            <Detail label="IP" value={selected.ipAddress ?? "—"} mono />
            <Detail label="User agent" value={selected.userAgent ?? "—"} mono small />
            <div>
              <div className="text-xs uppercase tracking-wider text-[#5C5C5C] mb-1">Payload</div>
              <pre className="text-[11px] bg-[#F7F3EE] border border-[#D9D2C2] rounded p-2 overflow-x-auto">
                {selected.payload ? JSON.stringify(selected.payload, null, 2) : "null"}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[#5C5C5C]">{label}</div>
      <div
        className={
          (mono ? "font-mono " : "") +
          (small ? "text-[11px] " : "text-sm ") +
          "text-[#1A1A1A] break-all"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className ?? ""}`}>{children}</td>;
}
