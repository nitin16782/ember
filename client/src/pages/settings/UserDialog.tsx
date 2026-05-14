import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { ROLE_OPTIONS, type RoleValue } from "./roles";

export interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass null/undefined to create; pass a user object to edit. */
  user?: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
  } | null;
  currentUserId: string | undefined;
  onSaved?: () => void;
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSaved,
}: UserDialogProps) {
  const isEdit = !!user;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<RoleValue>("associate");
  const [isActive, setIsActive] = useState(true);
  const [sendMagicLink, setSendMagicLink] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createMut = trpc.users.create.useMutation();
  const updateMut = trpc.users.update.useMutation();
  const setActiveMut = trpc.users.setActive.useMutation();
  const sendLinkMut = trpc.users.sendMagicLink.useMutation();

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (user) {
      setEmail(user.email);
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setRole(user.role as RoleValue);
      setIsActive(user.isActive);
      setSendMagicLink(false);
    } else {
      setEmail("");
      setName("");
      setPhone("");
      setRole("associate");
      setIsActive(true);
      setSendMagicLink(true);
    }
  }, [open, user]);

  const submitting =
    createMut.isPending || updateMut.isPending || setActiveMut.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (role === "associate" && !phone.trim()) {
      setError("Associates need a phone number for OTP login.");
      return;
    }

    try {
      if (isEdit && user) {
        await updateMut.mutateAsync({
          id: user.id,
          name: name.trim(),
          phone: phone.trim() || null,
          role,
        });
        if (isActive !== user.isActive) {
          await setActiveMut.mutateAsync({ id: user.id, isActive });
        }
        toast.success(`Updated ${name || user.email}`);
      } else {
        const res = await createMut.mutateAsync({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          role,
          sendMagicLink,
        });
        if (sendMagicLink && role !== "associate") {
          toast.success(
            res.magicLinkSent ? "User created · magic link sent" : "User created · magic link failed to send"
          );
        } else {
          toast.success("User created");
        }
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Could not save user");
    }
  }

  async function onSendMagicLink() {
    if (!user) return;
    try {
      await sendLinkMut.mutateAsync({ id: user.id });
      toast.success("Magic link sent");
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Could not send magic link");
    }
  }

  const isSelf = user?.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-navy">
            {isEdit ? "Edit user" : "Add user"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? "Update profile, role, or active status. Email cannot be changed."
              : "Email is required. For staff roles, a magic link is emailed so they can sign in."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEdit || submitting}
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
              maxLength={255}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone (E.164, optional for staff)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
              placeholder="+919876543210"
              maxLength={20}
            />
          </div>

          <div>
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as RoleValue)}
              disabled={submitting || (isEdit && isSelf && user?.role === "super_admin")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && isSelf && user?.role === "super_admin" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                You cannot change your own super_admin role.
              </p>
            )}
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-md border border-border/50 p-2">
              <Label htmlFor="active" className="text-sm">
                Account active
              </Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={submitting || isSelf}
              />
            </div>
          )}

          {!isEdit && role !== "associate" && (
            <div className="flex items-center justify-between rounded-md border border-border/50 p-2">
              <Label htmlFor="magic" className="text-sm">
                Email magic link on create
              </Label>
              <Switch
                id="magic"
                checked={sendMagicLink}
                onCheckedChange={setSendMagicLink}
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {isEdit && user?.role !== "associate" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSendMagicLink}
                disabled={sendLinkMut.isPending || !user.isActive}
              >
                {sendLinkMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Mail className="h-4 w-4 mr-1" />
                )}
                Send magic link
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-navy hover:bg-navy/90"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save" : "Create user"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
