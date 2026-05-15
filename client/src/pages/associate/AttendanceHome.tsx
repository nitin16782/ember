import { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp, Loader2, AlertTriangle, Edit3 } from "lucide-react";
import { MarkSequence } from "./MarkSequence";
import { PermissionsCheck } from "./PermissionsCheck";
import {
  resolveShiftActions,
  formatTime,
  formatDuration,
  type CurrentState,
} from "./lib/shiftActions";
import {
  getQueue,
  removeFromQueue,
  incrementAttempt,
  type QueuedMark,
  type ShiftEventType,
} from "./lib/offlineQueue";
import { useAssociateLocale, type AssociateStrings } from "@/lib/i18n/associate";

const MAX_RETRY_ATTEMPTS = 5;

function localizedEventTypeLabel(t: AssociateStrings, eventType: ShiftEventType): string {
  switch (eventType) {
    case "check_in": return t.eventCheckIn;
    case "check_out": return t.eventCheckOut;
    case "break_start": return t.eventBreakStart;
    case "break_end": return t.eventBreakEnd;
  }
}

function localizedActionLabel(t: AssociateStrings, eventType: ShiftEventType): string {
  switch (eventType) {
    case "check_in": return t.actionStartShift;
    case "check_out": return t.actionEndShift;
    case "break_start": return t.actionStartBreak;
    case "break_end": return t.actionEndBreak;
  }
}

function localizedStatusBadge(
  t: AssociateStrings,
  state: CurrentState,
  lastEventAt: string | null
): string {
  const time = lastEventAt ? formatTime(lastEventAt) : null;
  switch (state) {
    case "off": return t.homeReadyToStart;
    case "on_shift": return time ? t.homeOnShiftSince(time) : t.homeOnShift;
    case "on_break": return time ? t.homeOnBreakSince(time) : t.homeOnBreak;
  }
}

export default function AttendanceHome() {
  const { locale, t } = useAssociateLocale();
  const myStatus = trpc.attendance.myStatus.useQuery();
  const recentEvents = trpc.attendance.recentEvents.useQuery({ limit: 20 });
  const utils = trpc.useUtils();

  const [markingType, setMarkingType] = useState<{ eventType: ShiftEventType; label: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<QueuedMark[]>([]);
  const [stuckQueueIds, setStuckQueueIds] = useState<string[]>([]);

  // Snapshot queue length on mount and after each successful mark
  const refreshQueueState = useCallback(() => {
    setPendingQueue(getQueue());
  }, []);

  useEffect(() => {
    refreshQueueState();
  }, [refreshQueueState]);

  const markEvent = trpc.attendance.markEvent.useMutation();

  // Drain offline queue on mount and after status refreshes
  useEffect(() => {
    const drain = async () => {
      const queue = getQueue();
      if (queue.length === 0) return;
      for (const item of queue) {
        if (item.attemptCount >= MAX_RETRY_ATTEMPTS) {
          setStuckQueueIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
          continue;
        }
        try {
          await markEvent.mutateAsync({
            eventType: item.eventType,
            eventAt: item.eventAt,
            latitude: item.latitude,
            longitude: item.longitude,
            selfieKey: item.selfieKey,
          });
          removeFromQueue(item.id);
        } catch (e) {
          const err = e as { data?: { code?: string }; message?: string };
          const httpCode = err.data?.code;
          const isBusinessError =
            httpCode === "BAD_REQUEST" || httpCode === "NOT_FOUND" || httpCode === "FORBIDDEN";
          if (isBusinessError) {
            // State has moved on — this mark is irrelevant.
            // eslint-disable-next-line no-console
            console.warn("[attendance] dropping stale queued mark", item.id, err.message);
            removeFromQueue(item.id);
          } else {
            incrementAttempt(item.id, err.message);
          }
        }
      }
      refreshQueueState();
      await utils.attendance.myStatus.invalidate();
      await utils.attendance.recentEvents.invalidate();
    };
    drain();
  }, [markEvent, utils, refreshQueueState]);

  const status = myStatus.data;
  const actions = useMemo(() => {
    if (!status) return null;
    return resolveShiftActions({
      currentState: (status.currentState ?? "off") as CurrentState,
      canMarkCheckIn: status.canMarkCheckIn,
      canMarkCheckOut: status.canMarkCheckOut,
      canMarkBreakStart: status.canMarkBreakStart,
      canMarkBreakEnd: status.canMarkBreakEnd,
    });
  }, [status]);

  const closeMarkSequence = useCallback(() => setMarkingType(null), []);
  const onMarkSuccess = useCallback(async () => {
    setMarkingType(null);
    await utils.attendance.myStatus.invalidate();
    await utils.attendance.recentEvents.invalidate();
    refreshQueueState();
  }, [utils, refreshQueueState]);
  const onMarkQueued = useCallback(() => {
    refreshQueueState();
  }, [refreshQueueState]);

  if (myStatus.isLoading) {
    return (
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1A3A5C]" />
      </div>
    );
  }

  if (myStatus.isError || !status) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {t.homeLoadError}{" "}
        <button onClick={() => myStatus.refetch()} className="underline font-medium">
          {t.homeRetry}
        </button>
      </div>
    );
  }

  const firstName = status.personName?.split(" ")[0] ?? "there";
  // Use the active locale for date formatting so day names match.
  const localeTag = ({
    en: "en-IN", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN",
  } as const)[locale];
  const today = new Date().toLocaleDateString(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const noProperty = !status.propertyId && status.currentState === "off";
  const currentState = (status.currentState ?? "off") as CurrentState;

  return (
    <div className="space-y-4">
      {pendingQueue.length > 0 && (
        <div className="rounded-lg border border-[#7A5C0F] bg-[#F7F3EE] p-3 text-sm text-[#7A5C0F] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {t.homePendingMarks(pendingQueue.length)}
            {" — "}
            {stuckQueueIds.length > 0 ? t.homePendingNeedsSupervisor : t.homePendingSyncing}
          </span>
        </div>
      )}

      <header>
        <h1 className="font-['Georgia',serif] text-2xl text-[#1A3A5C]">{t.homeGreeting(firstName)}</h1>
        <p className="text-sm text-[#5C5C5C] mt-0.5">
          {status.propertyName ?? t.homeNoProperty}
        </p>
        <p className="text-xs text-[#5C5C5C]">{today}</p>
      </header>

      <PermissionsCheck />

      <section
        className={
          "rounded-lg p-5 text-center border " +
          (currentState === "on_shift"
            ? "bg-[#F2E7C7] border-[#7A5C0F]"
            : currentState === "on_break"
              ? "bg-[#F7F3EE] border-[#7A5C0F]"
              : "bg-[#F7F3EE] border-[#D9D2C2]")
        }
      >
        <div className="text-xs uppercase tracking-wider text-[#5C5C5C] mb-1">{t.homeCurrentState}</div>
        <div className="font-['Georgia',serif] text-xl text-[#1A3A5C]">
          {localizedStatusBadge(t, currentState, status.lastEventAt)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#5C5C5C]">{t.homeWorkLabel}</div>
            <div className="text-[#1A1A1A] font-medium">
              {formatDuration(status.todayMinutesWorked)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[#5C5C5C]">{t.homeBreakLabel}</div>
            <div className="text-[#1A1A1A] font-medium">
              {formatDuration(status.todayBreakMinutes)}
            </div>
          </div>
        </div>
      </section>

      {noProperty && (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {t.homeNoPropertyWarning}
        </div>
      )}

      {actions && actions.primary && status.propertyId ? (
        <button
          onClick={() =>
            setMarkingType({
              eventType: actions.primary!.eventType,
              label: localizedActionLabel(t, actions.primary!.eventType),
            })
          }
          disabled={!actions.primary.enabled}
          className="w-full min-h-[64px] rounded-lg bg-[#1A3A5C] text-white font-medium text-base disabled:opacity-50"
        >
          {localizedActionLabel(t, actions.primary.eventType)}
        </button>
      ) : null}

      {actions && actions.secondary && status.propertyId ? (
        <button
          onClick={() =>
            setMarkingType({
              eventType: actions.secondary!.eventType,
              label: localizedActionLabel(t, actions.secondary!.eventType),
            })
          }
          disabled={!actions.secondary.enabled}
          className="w-full min-h-[56px] rounded-lg border-2 border-[#1A3A5C] bg-white text-[#1A3A5C] font-medium disabled:opacity-50"
        >
          {localizedActionLabel(t, actions.secondary.eventType)}
        </button>
      ) : null}

      <section className="rounded-lg border border-[#D9D2C2] bg-white">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between min-h-[44px]"
          aria-expanded={historyOpen}
        >
          <span className="text-sm font-medium text-[#1A3A5C]">{t.homeTodaysMarks}</span>
          {historyOpen ? (
            <ChevronUp className="h-4 w-4 text-[#5C5C5C]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#5C5C5C]" />
          )}
        </button>
        {historyOpen && (
          <div className="px-4 pb-3 space-y-1 border-t border-[#D9D2C2] pt-2">
            <RecentEventList
              events={recentEvents.data?.events ?? []}
              loading={recentEvents.isLoading}
              t={t}
            />
          </div>
        )}
      </section>

      {markingType && status.personId && status.propertyId ? (
        <MarkSequence
          eventType={markingType.eventType}
          primaryLabel={markingType.label}
          personId={status.personId}
          onClose={closeMarkSequence}
          onSuccess={onMarkSuccess}
          onQueued={onMarkQueued}
        />
      ) : null}
    </div>
  );
}

function RecentEventList({
  events,
  loading,
  t,
}: {
  events: Array<{
    id: string;
    eventType: ShiftEventType;
    eventAt: string;
    edited: boolean;
    markedByOnBehalf: boolean;
  }>;
  loading: boolean;
  t: AssociateStrings;
}) {
  if (loading) return <div className="text-xs text-[#5C5C5C] py-2">{t.loading}</div>;
  if (events.length === 0) return <div className="text-xs text-[#5C5C5C] py-2">{t.homeNoMarksToday}</div>;
  return (
    <ul className="space-y-1">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 text-sm py-1"
        >
          <span className="text-[#5C5C5C] tabular-nums w-12 flex-shrink-0">
            {formatTime(e.eventAt)}
          </span>
          <span className="flex-1 text-[#1A1A1A]">{localizedEventTypeLabel(t, e.eventType)}</span>
          {e.edited ? (
            <span className="text-[10px] uppercase text-[#7A5C0F] font-medium">{t.homeBadgeEdited}</span>
          ) : null}
          {e.markedByOnBehalf ? (
            <span className="text-[10px] uppercase text-[#7A5C0F] font-medium">{t.homeBadgeOnBehalf}</span>
          ) : null}
          <Edit3 className="h-3 w-3 text-[#5C5C5C] opacity-50" aria-hidden />
        </li>
      ))}
    </ul>
  );
}

