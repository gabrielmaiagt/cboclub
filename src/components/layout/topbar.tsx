"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { destroySession } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/features/search/components/global-search";
import { QuickAdd } from "@/features/search/components/quick-add";
import { firebaseAuth } from "@/lib/firebase/client";
import { ROLE_LABELS, type User } from "@/types/domain";

interface TopbarProps {
  user: User;
  /** CTA do Quick Add (§48), injetado pela tela ativa. */
  quickAdd?: React.ReactNode;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({ user, quickAdd }: TopbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      try {
        await firebaseAuth().signOut();
      } catch {
        // Sessao do servidor e o que importa; segue mesmo se o SDK falhar
      }
      const result = await destroySession();
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível sair.");
        return;
      }
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
      <MobileNav role={user.role} />

      {/* Busca global (§53) */}
      <div className="max-w-md flex-1">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {quickAdd ?? <QuickAdd />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/50"
              aria-label="Menu do usuário"
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {initials(user.fullName || user.email || "?")}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} disabled={pending}>
              <LogOut className="size-4" />
              {pending ? "Saindo..." : "Sair"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
