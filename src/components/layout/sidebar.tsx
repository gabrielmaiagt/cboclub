"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_SECTIONS } from "@/components/layout/nav-config";
import { canRead } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/domain";

interface SidebarProps {
  role: AppRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-card/30 md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-border/60 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
          X1
        </div>
        <span className="text-sm font-semibold tracking-tight">CBO Club</span>
      </div>

      <nav className="thin-scroll flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section, index) => {
          const visible = section.items.filter(
            (item) => !item.readGroup || canRead(role, item.readGroup)
          );
          if (!visible.length) return null;

          return (
            <div key={section.label ?? `section-${index}`}>
              {section.label && (
                <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
              )}
              <ul className="space-y-1">
                {visible.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  // So o que REALMENTE nao existe ainda parece
                  // desabilitado — e diz o porque, em vez de so apagar
                  if (item.soon) {
                    return (
                      <li key={item.href}>
                        <span
                          title="Este módulo ainda não foi construído"
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          <span className="ml-auto rounded border border-border/60 px-1.5 py-px text-[11px] text-muted-foreground/60">
                            breve
                          </span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-accent font-semibold text-accent-foreground shadow-[inset_2px_0_0_0_var(--foreground)]"
                            : "text-foreground/80 hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            !active && "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border/60 px-4 py-3">
        <p className="text-[11px] text-muted-foreground/60">
          Ofertas · Criativos · Copies · Referências
        </p>
      </div>
    </aside>
  );
}
