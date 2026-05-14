import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { ROLE_OPTIONS, labelForRole, type RoleValue } from "./roles";
import { UserDialog } from "./UserDialog";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastSignedInAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function formatLastSignIn(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);

  const utils = trpc.useUtils();

  const isActiveFilter =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  const list = trpc.users.list.useQuery(
    {
      search: search.trim() || undefined,
      role: roleFilter === "all" ? undefined : (roleFilter as RoleValue),
      isActive: isActiveFilter,
      limit: 200,
    },
    { placeholderData: (prev) => prev }
  );

  const counts = trpc.users.roleCounts.useQuery(undefined, {
    staleTime: 30_000,
  });

  const users = (list.data?.users ?? []) as UserRow[];

  const total = list.data?.total ?? 0;

  function onSaved() {
    utils.users.list.invalidate();
    utils.users.roleCounts.invalidate();
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-navy/5">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm mb-0.5">Manage users</p>
            <p>
              Add staff accounts and assign roles. Staff receive a magic-link email to set their
              password. Associates use phone OTP — no email signin.
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="bg-navy hover:bg-navy/90">
            <Plus className="h-4 w-4 mr-1" />
            Add user
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone"
              className="pl-8"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
            Role
          </label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
            Status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-white overflow-hidden">
        {list.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No users match these filters. Try adjusting search or click "Add user".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream text-navy">
                <tr className="text-left">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Last sign-in</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setEditing(u)}
                    className="hover:bg-cream cursor-pointer"
                  >
                    <Td>
                      <div className="font-medium text-foreground">{u.name ?? "—"}</div>
                      {u.id === currentUser?.id && (
                        <div className="text-[10px] uppercase text-gold">You</div>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">{u.email}</Td>
                    <Td className="text-muted-foreground">{u.phone ?? "—"}</Td>
                    <Td>{labelForRole(u.role)}</Td>
                    <Td>
                      <Badge
                        variant="outline"
                        className={
                          u.isActive
                            ? "border-green-300 text-green-700"
                            : "border-red-300 text-red-700"
                        }
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    <Td className="text-xs tabular-nums text-muted-foreground">
                      {formatLastSignIn(u.lastSignedInAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {users.length > 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border/50">
            Showing {users.length} of {total}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Members by role
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((r) => (
            <Card key={r.value} className="border-border/50">
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {r.description}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  <Users className="h-3 w-3 mr-1" />
                  {counts.data?.[r.value] ?? 0}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <UserDialog
        open={creating}
        onOpenChange={(o) => setCreating(o)}
        currentUserId={currentUser?.id}
        onSaved={onSaved}
      />
      <UserDialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        user={editing}
        currentUserId={currentUser?.id}
        onSaved={onSaved}
      />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className ?? ""}`}>{children}</td>;
}
