import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export interface PendingEditRequestsProps {
  propertyId?: string;
}

function formatLocal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function labelForType(t: string): string {
  switch (t) {
    case "check_in": return "Check in";
    case "check_out": return "Check out";
    case "break_start": return "Break start";
    case "break_end": return "Break end";
    default: return t;
  }
}

export function PendingEditRequests({ propertyId }: PendingEditRequestsProps) {
  const list = trpc.attendance.pendingEditRequests.useQuery(
    propertyId ? { propertyId } : {}
  );
  const utils = trpc.useUtils();
  const approveEdit = trpc.attendance.approveEdit.useMutation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const requests = list.data ?? [];

  if (list.isLoading) return null;
  if (requests.length === 0) return null;

  async function handleDecision(id: string, decision: "approve" | "reject") {
    setBusy(id + decision);
    try {
      await approveEdit.mutateAsync({
        editRequestId: id,
        decision,
        reviewNote: reviewNote.trim() || undefined,
      });
      toast.success(decision === "approve" ? "Edit approved" : "Edit rejected");
      setActiveId(null);
      setReviewNote("");
      await utils.attendance.pendingEditRequests.invalidate();
      await utils.attendance.todaysRoster.invalidate();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Could not record decision");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-[#D9D2C2] bg-white">
      <header className="px-4 py-3 border-b border-[#D9D2C2] flex items-center justify-between">
        <h2 className="font-['Georgia',serif] text-lg text-[#1A3A5C]">
          Pending edit requests
        </h2>
        <span className="text-xs text-[#5C5C5C]">{requests.length} waiting</span>
      </header>
      <ul className="divide-y divide-[#E8E2D4]">
        {requests.map((r) => {
          const isActive = activeId === r.id;
          return (
            <li key={r.id} className="p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1A1A1A]">{r.personName}</div>
                  <div className="text-xs text-[#5C5C5C] mt-0.5">
                    {labelForType(r.originalEventType)} · originally {formatLocal(r.originalEventAt)}
                  </div>
                  <div className="text-sm text-[#1A3A5C] mt-1">
                    Proposed time: <strong>{formatLocal(r.newEventAt)}</strong>
                  </div>
                  <div className="text-sm text-[#5C5C5C] mt-1 whitespace-pre-wrap">
                    "{r.reason}"
                  </div>
                  <div className="text-[10px] text-[#5C5C5C] mt-1">
                    Requested {formatLocal(r.requestedAt)}
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  {isActive ? (
                    <>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Optional note for the associate"
                        maxLength={500}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDecision(r.id, "approve")}
                          disabled={busy !== null}
                          className="flex-1 bg-[#1A3A5C] hover:bg-[#15304d]"
                        >
                          {busy === r.id + "approve" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecision(r.id, "reject")}
                          disabled={busy !== null}
                          className="flex-1"
                        >
                          {busy === r.id + "reject" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          Reject
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActiveId(null);
                          setReviewNote("");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setActiveId(r.id)}
                      className="bg-[#1A3A5C] hover:bg-[#15304d]"
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
