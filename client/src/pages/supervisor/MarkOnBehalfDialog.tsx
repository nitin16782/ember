import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type EventType = "check_in" | "check_out" | "break_start" | "break_end";

export interface MarkOnBehalfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
  onSuccess?: () => void;
}

function nowLocalDate(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function nowLocalTime(): string {
  const d = new Date();
  return [String(d.getHours()).padStart(2, "0"), String(d.getMinutes()).padStart(2, "0")].join(":");
}

export function MarkOnBehalfDialog({
  open,
  onOpenChange,
  personId,
  personName,
  onSuccess,
}: MarkOnBehalfDialogProps) {
  const [eventType, setEventType] = useState<EventType>("check_in");
  const [date, setDate] = useState(nowLocalDate());
  const [time, setTime] = useState(nowLocalTime());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markOnBehalf = trpc.attendance.markEventOnBehalf.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (notes.trim().length < 10) {
      setError("Please explain why you are marking on behalf (at least 10 characters).");
      return;
    }

    const eventAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(eventAt.getTime())) {
      setError("Invalid date/time");
      return;
    }
    const now = new Date();
    if (eventAt.getTime() > now.getTime() + 60_000) {
      setError("Event time cannot be in the future.");
      return;
    }
    const sevenDaysMs = 7 * 24 * 60 * 60_000;
    if (eventAt.getTime() < now.getTime() - sevenDaysMs) {
      setError("Event time cannot be more than 7 days in the past.");
      return;
    }

    setSubmitting(true);
    try {
      await markOnBehalf.mutateAsync({
        personId,
        eventType,
        eventAt: eventAt.toISOString(),
        notes: notes.trim(),
      });
      toast.success(`Marked on behalf of ${personName}`);
      onSuccess?.();
      onOpenChange(false);
      // reset
      setEventType("check_in");
      setDate(nowLocalDate());
      setTime(nowLocalTime());
      setNotes("");
    } catch (err) {
      const e = err as { data?: { code?: string }; message?: string };
      setError(e.message ?? "Could not record event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-['Georgia',serif] text-[#1A3A5C]">
            Mark on behalf of {personName}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5C5C5C]">
            Records as a supervisor override. The event audit shows your name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Event type</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check_in">Check in</SelectItem>
                <SelectItem value="break_start">Break start</SelectItem>
                <SelectItem value="break_end">Break end</SelectItem>
                <SelectItem value="check_out">Check out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="onbehalf-date">Date</Label>
              <Input
                id="onbehalf-date"
                type="date"
                value={date}
                max={nowLocalDate()}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="onbehalf-time">Time</Label>
              <Input
                id="onbehalf-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="onbehalf-notes">Reason (required)</Label>
            <Textarea
              id="onbehalf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why are you marking this event on the associate's behalf?"
              minLength={10}
              maxLength={500}
              rows={3}
              required
            />
            <div className="text-[10px] text-[#5C5C5C] mt-1">
              {notes.length}/500 — at least 10 characters
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || notes.trim().length < 10}
              className="bg-[#1A3A5C] hover:bg-[#15304d]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark on behalf"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
