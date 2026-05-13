import { useEffect, useMemo, useState } from "react";
import { Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, RefreshCw, MoreHorizontal, X } from "lucide-react";
import { AnomalyIndicator } from "./AnomalyIndicator";
import { MarkOnBehalfDialog } from "./MarkOnBehalfDialog";
import { PendingEditRequests } from "./PendingEditRequests";
import {
  ROSTER_STATUS_INFO,
  ROSTER_STATUS_ORDER,
  countStatuses,
  sortRoster,
  type RosterStatus,
} from "@/lib/anomalyLabels";

const REFETCH_INTERVAL_MS = 60_000;
const GLOBAL_ROLES = ["ops_lead", "central_admin", "super_admin"];
const ALLOWED_ROLES = [
  "supervisor",
  "property_manager",
  "ops_lead",
  "central_admin",
  "super_admin",
];

function istDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function lastWeekOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const value = istDateString(d);
    const label =
      i === 0
        ? `Today (${value})`
        : i === 1
          ? `Yesterday (${value})`
          : value;
    out.push({ value, label });
  }
  return out;
}

export default function TodaysRoster() {
  const { user } = useAuth();

  if (user && !ALLOWED_ROLES.includes(user.role)) {
    if (user.role === "associate") return <Redirect to="/associate/attendance" />;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        This roster is only available to supervisors and above.
      </div>
    );
  }

  const showPropertyPicker = user ? GLOBAL_ROLES.includes(user.role) || user.role === "property_manager" : false;

  const properties = trpc.properties.list.useQuery(undefined, {
    enabled: showPropertyPicker,
    staleTime: 5 * 60_000,
  });
  const propertyOptions = (properties.data ?? []) as Array<{ id: string; name: string }>;

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(istDateString());
  const [statusFilter, setStatusFilter] = useState<RosterStatus | null>(null);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [openAnomalies, setOpenAnomalies] = useState<Record<string, boolean>>({});
  const [markDialogTarget, setMarkDialogTarget] = useState<{ personId: string; personName: string } | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function onVis() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const roster = trpc.attendance.todaysRoster.useQuery(
    { propertyId: selectedPropertyId, date },
    {
      refetchInterval: visible ? REFETCH_INTERVAL_MS : false,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    }
  );

  useEffect(() => {
    if (roster.dataUpdatedAt) setLastRefreshedAt(new Date(roster.dataUpdatedAt));
  }, [roster.dataUpdatedAt]);

  const data = roster.data;
  const propertyName = useMemo(() => {
    if (!data?.propertyId) return null;
    const match = propertyOptions.find((p) => p.id === data.propertyId);
    return match?.name ?? null;
  }, [data, propertyOptions]);

  const rows = data?.rows ?? [];
  const counts = useMemo(() => countStatuses(rows), [rows]);
  const sorted = useMemo(() => sortRoster(rows), [rows]);
  const filtered = useMemo(
    () => (statusFilter ? sorted.filter((r) => r.status === statusFilter) : sorted),
    [sorted, statusFilter]
  );

  const detailPersonRow = filtered.find((r) => r.personId === openRowId) ?? rows.find((r) => r.personId === openRowId) ?? null;
  const recentEvents = trpc.attendance.recentEvents.useQuery(
    detailPersonRow ? { personId: detailPersonRow.personId, fromDate: date, toDate: date, limit: 50 } : { limit: 1 },
    { enabled: !!detailPersonRow }
  );

  function refresh() {
    roster.refetch();
  }

  if (roster.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#1A3A5C]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-['Georgia',serif] text-2xl text-[#1A3A5C]">Today's roster</h1>
          <p className="text-sm text-[#5C5C5C]">
            {propertyName ?? (data?.propertyId ? "Unknown property" : "No property selected")}
            {" · "}
            {date}
            {" · "}
            Auto-refreshing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showPropertyPicker && (
            <Select
              value={selectedPropertyId ?? "auto"}
              onValueChange={(v) => setSelectedPropertyId(v === "auto" ? undefined : v)}
            >
              <SelectTrigger className="min-w-[200px]">
                <SelectValue placeholder="Choose property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">My assigned property</SelectItem>
                {propertyOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={date} onValueChange={setDate}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lastWeekOptions().map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={roster.isFetching}
            aria-label="Refresh"
            className="border-[#1A3A5C] text-[#1A3A5C]"
          >
            {roster.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="text-xs text-[#5C5C5C]">
        Last refreshed {formatTime(lastRefreshedAt.toISOString())}
      </div>

      <SummaryStrip
        counts={counts}
        activeFilter={statusFilter}
        onToggle={(s) => setStatusFilter((cur) => (cur === s ? null : s))}
      />

      <RosterTable
        rows={filtered}
        openAnomalies={openAnomalies}
        toggleAnomaly={(id) => setOpenAnomalies((s) => ({ ...s, [id]: !s[id] }))}
        onOpenRow={setOpenRowId}
        onMarkOnBehalf={(personId, personName) => setMarkDialogTarget({ personId, personName })}
      />

      <PendingEditRequests propertyId={selectedPropertyId} />

      {detailPersonRow && (
        <DetailPanel
          row={detailPersonRow}
          events={recentEvents.data?.events ?? []}
          loading={recentEvents.isLoading}
          onClose={() => setOpenRowId(null)}
          onMarkOnBehalf={() =>
            setMarkDialogTarget({
              personId: detailPersonRow.personId,
              personName: detailPersonRow.personName,
            })
          }
        />
      )}

      {markDialogTarget && (
        <MarkOnBehalfDialog
          open={!!markDialogTarget}
          onOpenChange={(open) => {
            if (!open) setMarkDialogTarget(null);
          }}
          personId={markDialogTarget.personId}
          personName={markDialogTarget.personName}
          onSuccess={() => roster.refetch()}
        />
      )}
    </div>
  );
}

// ─── Summary strip ──────────────────────────────────────────────────

function SummaryStrip({
  counts,
  activeFilter,
  onToggle,
}: {
  counts: ReturnType<typeof countStatuses>;
  activeFilter: RosterStatus | null;
  onToggle: (s: RosterStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ROSTER_STATUS_ORDER.map((s) => {
        const info = ROSTER_STATUS_INFO[s];
        const active = activeFilter === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onToggle(s)}
            className={
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-shadow " +
              (active
                ? `${info.bg} ${info.border} ${info.text} shadow-sm ring-2 ring-[#1A3A5C]/30`
                : `${info.bg} ${info.border} ${info.text}`)
            }
            aria-pressed={active}
          >
            <span>{info.label}</span>
            <span className="bg-white/60 text-[#1A1A1A] rounded-full px-1.5 min-w-[20px] text-center tabular-nums">
              {counts[s]}
            </span>
          </button>
        );
      })}
      <div className="text-xs text-[#5C5C5C] self-center ml-2">
        {counts.total} assigned
      </div>
    </div>
  );
}

// ─── Roster table ───────────────────────────────────────────────────

interface RosterRow {
  personId: string;
  personName: string;
  role: string;
  employmentType: string | null;
  status: string;
  firstCheckInAt: string | null;
  lastEventAt: string | null;
  lastEventType: string | null;
  hasGeofenceViolation: boolean;
  latestSelfieKey: string | null;
  totalMinutesToday: number;
  events: Array<{
    id: string;
    eventType: string;
    eventAt: string;
    withinGeofence: boolean | null;
    markedByOnBehalf: boolean;
  }>;
}

function RosterTable({
  rows,
  openAnomalies,
  toggleAnomaly,
  onOpenRow,
  onMarkOnBehalf,
}: {
  rows: RosterRow[];
  openAnomalies: Record<string, boolean>;
  toggleAnomaly: (id: string) => void;
  onOpenRow: (id: string) => void;
  onMarkOnBehalf: (personId: string, personName: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[#D9D2C2] bg-white p-6 text-center text-sm text-[#5C5C5C]">
        No assignments matching this filter.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[#D9D2C2] bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F3EE] text-[#1A3A5C] sticky top-0">
            <tr className="text-left">
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>First in</Th>
              <Th>Last event</Th>
              <Th>Hours</Th>
              <Th aria-label="Anomalies"><span aria-hidden>⚠</span></Th>
              <Th aria-label="Actions"><span aria-hidden>⋯</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E2D4]">
            {rows.map((r) => {
              const status = (r.status as RosterStatus);
              const info = ROSTER_STATUS_INFO[status] ?? ROSTER_STATUS_INFO.absent;
              const rowBg =
                r.status === "on_break" ? "bg-[#FBF8F2]" : "bg-white";
              return (
                <tr
                  key={r.personId}
                  className={`${rowBg} hover:bg-[#F1ECE2] cursor-pointer`}
                  onClick={() => onOpenRow(r.personId)}
                >
                  <Td>
                    <div className="font-medium text-[#1A1A1A]">{r.personName}</div>
                    <div className="text-xs text-[#5C5C5C]">
                      {r.role}
                      {r.employmentType ? ` · ${r.employmentType}` : ""}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${info.border} ${info.bg} ${info.text}`}
                    >
                      {info.label}
                      {r.lastEventAt && (status === "checked_in" || status === "on_break")
                        ? ` since ${formatTime(r.lastEventAt)}`
                        : ""}
                    </span>
                  </Td>
                  <Td>{formatTime(r.firstCheckInAt)}</Td>
                  <Td>
                    {r.lastEventType ? (
                      <>
                        <span className="text-[#1A1A1A]">{eventTypeLabel(r.lastEventType)}</span>
                        <span className="text-[#5C5C5C]"> · {formatTime(r.lastEventAt)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="tabular-nums">{formatDuration(r.totalMinutesToday)}</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <AnomalyIndicator
                      codes={r.hasGeofenceViolation ? ["geofence_violation"] : []}
                      expanded={openAnomalies[r.personId]}
                      onToggle={() => toggleAnomaly(r.personId)}
                    />
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpenRow(r.personId)}>
                          View today's marks
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onMarkOnBehalf(r.personId, r.personName)}
                        >
                          Mark event on behalf
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => (window.location.href = `/people/${r.personId}`)}
                        >
                          View profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function eventTypeLabel(t: string): string {
  switch (t) {
    case "check_in": return "Check in";
    case "check_out": return "Check out";
    case "break_start": return "Break start";
    case "break_end": return "Break end";
    default: return t;
  }
}

function Th({ children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...props} className="px-3 py-2 text-xs font-medium uppercase tracking-wider">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...props} className={`px-3 py-2 align-top ${className ?? ""}`}>
      {children}
    </td>
  );
}

// ─── Detail panel ───────────────────────────────────────────────────

function DetailPanel({
  row,
  events,
  loading,
  onClose,
  onMarkOnBehalf,
}: {
  row: RosterRow;
  events: Array<{
    id: string;
    eventType: string;
    eventAt: string;
    edited: boolean;
    markedByOnBehalf: boolean;
    withinGeofence: boolean | null;
  }>;
  loading: boolean;
  onClose: () => void;
  onMarkOnBehalf: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full md:w-[420px] bg-white border-l border-[#D9D2C2] shadow-xl overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-[#D9D2C2] p-4 flex items-center justify-between">
        <div>
          <h2 className="font-['Georgia',serif] text-lg text-[#1A3A5C]">{row.personName}</h2>
          <div className="text-xs text-[#5C5C5C]">{row.role}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <Button
          onClick={onMarkOnBehalf}
          className="w-full bg-[#1A3A5C] hover:bg-[#15304d]"
        >
          Mark event on behalf
        </Button>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-[#5C5C5C] mb-2">
            Today's events
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[#1A3A5C]" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-sm text-[#5C5C5C]">No marks recorded today.</div>
          ) : (
            <ul className="space-y-2">
              {events
                .slice()
                .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime())
                .map((e) => (
                  <li key={e.id} className="rounded border border-[#E8E2D4] p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#1A1A1A]">
                        {eventTypeLabel(e.eventType)}
                      </span>
                      <span className="text-xs tabular-nums text-[#5C5C5C]">
                        {formatTime(e.eventAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.edited && (
                        <span className="text-[10px] uppercase text-[#7A5C0F]">edited</span>
                      )}
                      {e.markedByOnBehalf && (
                        <span className="text-[10px] uppercase text-[#7A5C0F]">on behalf</span>
                      )}
                      {e.withinGeofence === false && (
                        <span className="text-[10px] uppercase text-red-700">outside fence</span>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
