"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setUserActiveAction, setUserRoleAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { isOwner } from "@/lib/auth/permissions";
import { APP_ROLES, ROLE_LABELS, type AppRole, type User } from "@/types/domain";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Equipe (§49): nome, email, papel, ativo. Owner altera papel. */
export function EquipeView({
  users,
  currentUid,
  role,
}: {
  users: User[];
  currentUid: string;
  role: AppRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canManage = isOwner(role);

  function handleRoleChange(uid: string, newRole: string) {
    startTransition(async () => {
      const result = await setUserRoleAction(uid, newRole);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível alterar o papel.");
        return;
      }
      toast.success("Papel atualizado");
      router.refresh();
    });
  }

  function handleActiveToggle(uid: string, active: boolean) {
    startTransition(async () => {
      const result = await setUserActiveAction(uid, active);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.success(active ? "Usuário reativado" : "Usuário desativado");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Equipe" description={`${users.length} pessoas com acesso ao sistema.`} />

      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUid;
              return (
                <tr key={u.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[11px]">{initials(u.fullName || u.email || "?")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3">
                    {canManage && !isSelf ? (
                      <Select
                        value={u.role}
                        onValueChange={(v) => handleRoleChange(u.id, v)}
                        disabled={pending}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APP_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">{ROLE_LABELS[u.role]}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    {canManage && !isSelf ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleActiveToggle(u.id, !u.active)}
                      >
                        {u.active ? "Desativar" : "Reativar"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
