import { useMemo, useState } from "react";
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
import { Loader2, Download, FileWarning } from "lucide-react";
import { toast } from "sonner";

const ADMIN_ROLES = ["property_manager", "ops_lead", "central_admin", "super_admin"];

const STATUS_OPTIONS = [
  { value: "present", label: "Present", chip: "bg-[#F2E7C7] border-[#7A5C0F] text-[#1A3A5C]" },
  { value: "partial", label: "Partial", chip: "bg-[#F7F3EE] border-[#7A5C0F] text-[#1A3A5C]" },
  { value: "absent", label: "Absent", chip: "bg-white border-red-400 text-red-700" },
  { value: "leave", label: "Leave", chip: "bg-[#F1EFEC] border-[#5C5C5C] text-[#5C5C5C]" },
  { value: "holiday", label: "Holiday", chip: "bg-[#F1EFEC] border-[#5C5C5C] text-[#5C5C5C]" },
  { value: "weekly_off", label: "Weekly off", chip: "bg-[#F1EFEC] border-[#5C5C5C] text-[#5C5C5C]" },
  { value: "absconding", label: "Absconding", chip: "bg-white border-red-700 text-red-900" },
];

type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];

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

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function quickRanges(today: string) {
  return [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: "Last 7 days", from: shiftDate(today, -6), to: today },
    { label: "Last 30 days", from: shiftDate(today, -29), to: today },
  ];
}

function statusInfo(value: string) {
  return STATUS_OPTIONS.find((o) => o.value === value) ?? null;
}

export default function AttendanceOverview() {
  const { user } = useAuth();

  if (user && !ADMIN_ROLES.includes(user.role)) {
    if (user.role === "associate") return <Redirect to="/associate/attendance" />;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Attendance overview is restricted to property managers and above.
      </div>
    );
  }

  const today = istDateString();
  const [fromDate, setFromDate] = useState(shiftDate(today, -6));
  const [toDate, setToDate] = useState(today);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusValue[]>([]);
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);

  const propertiesQuery = trpc.properties.list.useQuery(undefined, { staleTime: 5 * 60_000 });
  const propertyOptions = (propertiesQuery.data ?? []) as Array<{ id: string; name: string }>;

  const summaries = trpc.attendance.adminSummaries.useQuery(
    {
      fromDate,
      toDate,
      propertyIds: selectedPropertyId ? [selectedPropertyId] : undefined,
      statuses: selectedStatuses.length > 0 ? (selectedStatuses as any) : undefined,
      onlyAnomalies: onlyAnomalies || undefined,
      limit: 200,
    },
    { placeholderData: (prev) => prev }
  );

  const exportMutation = trpc.attendance.exportCsv.useMutation();

  const rows = summaries.data?.rows ?? [];

  const tiles = useMemo(() => {
    const totals = {
      total: rows.length,
      present: 0,
      partial: 0,
      absent: 0,
      leave: 0,
      anomalies: 0,
    };
    for (const r of rows) {
      if (r.status === "present") totals.present++;
      else if (r.status === "partial") totals.partial++;
      else if (r.status === "absent") totals.absent++;
      else if (r.status === "leave") totals.leave++;
      if (r.hasAnomalies) totals.anomalies++;
    }
    return totals;
  }, [rows]);

  async function downloadCsv() {
    try {
      const result = await exportMutation.mutateAsync({
        fromDate,
        toDate,
        propertyIds: selectedPropertyId ? [selectedPropertyId] : undefined,
        statuses: selectedStatuses.length > 0 ? (selectedStatuses as any) : undefined,
        onlyAnomalies: onlyAnomalies || undefined,
      });

      if (result.truncated) {
        toast.warning(
          `Export truncated to first ${result.rowCount.toLocaleString()} rows. Narrow filters to see all.`
        );
      }

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${result.rowCount.toLocaleString()} row${result.rowCount === 1 ? "" : "s"}`);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Could not export CSV");
    }
  }

  function toggleStatus(s: StatusValue) {
    setSelectedStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function applyQuickRange(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-['Georgia',serif] text-2xl text-[#1A3A5C]">Attendance overview</h1>
          <p className="text-sm text-[#5C5C5C]">
            Cross-property daily summaries. {rows.length} row{rows.length === 1 ? "" : "s"} shown.
          </p>
        </div>
        <Button
          onClick={downloadCsv}
          disabled={exportMutation.isPending}
          className="bg-[#1A3A5C] hover:bg-[#15304d]"
        >
          {exportMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download CSV
        </Button>
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
          <label className="text-xs uppercase tracking-wider text-[#5C5C5C] block mb-1">
            Quick range
          </label>
          <Select
            value=""
            onValueChange={(v) => {
              const r = quickRanges(istDateString()).find((q) => q.label === v);
              if (r) applyQuickRange(r.from, r.to);
            }}
          >
            <SelectTrigger className="min-w-[160px]">
              <SelectValue placeholder="Pick…" />
            </SelectTrigger>
            <SelectContent>
              {quickRanges(istDateString()).map((q) => (
                <SelectItem key={q.label} value={q.label}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-[#5C5C5C] block mb-1">
            Property
          </label>
          <Select
            value={selectedPropertyId ?? "all"}
            onValueChange={(v) => setSelectedPropertyId(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="min-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {propertyOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#1A1A1A] ml-2">
          <input
            type="checkbox"
            checked={onlyAnomalies}
            onChange={(e) => setOnlyAnomalies(e.target.checked)}
            className="h-4 w-4"
          />
          Only show entries with anomalies
        </label>
      </section>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => {
          const active = selectedStatuses.includes(s.value);
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleStatus(s.value)}
              className={
                "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border " +
                s.chip +
                (active ? " ring-2 ring-[#1A3A5C]/30 shadow-sm" : "")
              }
              aria-pressed={active}
            >
              {s.label}
            </button>
          );
        })}
        {selectedStatuses.length > 0 && (
          <button
            type="button"
            className="text-xs text-[#1A3A5C] underline"
            onClick={() => setSelectedStatuses([])}
          >
            Clear status filter
          </button>
        )}
      </div>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Tile label="Total" value={tiles.total} />
        <Tile label="Present" value={tiles.present} />
        <Tile label="Partial" value={tiles.partial} />
        <Tile label="Absent" value={tiles.absent} />
        <Tile label="Anomalies" value={tiles.anomalies} accent />
      </section>

      {summaries.data?.backfillTruncated && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-900 flex items-start gap-2">
          <FileWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Backfill capped at 500 missing summaries. Narrow the date range or wait for the daily
            cron to populate the rest.
          </span>
        </div>
      )}

      <section className="rounded-lg border border-[#D9D2C2] bg-white overflow-hidden">
        {summaries.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1A3A5C]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-center text-[#5C5C5C]">
            No daily summaries match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F3EE] text-[#1A3A5C]">
                <tr className="text-left">
                  <Th>Name</Th>
                  <Th>Property</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Hours</Th>
                  <Th>Breaks</Th>
                  <Th>Anomalies</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D4]">
                {rows.map((r, idx) => {
                  const info = statusInfo(r.status);
                  return (
                    <tr key={r.id ?? idx} className="hover:bg-[#F9F5EC]">
                      <Td>
                        <div className="font-medium text-[#1A1A1A]">{r.personName}</div>
                        <div className="text-xs text-[#5C5C5C]">
                          {r.employmentType ?? ""}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-[#1A1A1A]">{r.propertyName ?? "—"}</span>
                      </Td>
                      <Td className="tabular-nums">{formatDate(r.date)}</Td>
                      <Td>
                        <span
                          className={
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs border " +
                            (info?.chip ?? "")
                          }
                        >
                          {info?.label ?? r.status}
                        </span>
                      </Td>
                      <Td className="tabular-nums">{formatDuration(r.netWorkMinutes)}</Td>
                      <Td className="tabular-nums">
                        {r.breakCount > 0 ? `${formatDuration(r.breakMinutes)} (${r.breakCount})` : "—"}
                      </Td>
                      <Td>
                        {r.anomalyCodes.length > 0 ? (
                          <span className="text-xs text-yellow-900">
                            {r.anomalyCodes.length}
                          </span>
                        ) : (
                          ""
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={
        "rounded-lg border p-3 " +
        (accent ? "border-yellow-300 bg-yellow-50" : "border-[#D9D2C2] bg-white")
      }
    >
      <div className="text-xs uppercase tracking-wider text-[#5C5C5C]">{label}</div>
      <div className="text-2xl font-semibold text-[#1A3A5C] tabular-nums">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className ?? ""}`}>{children}</td>;
}
