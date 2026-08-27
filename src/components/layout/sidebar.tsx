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
    <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-card/30 md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
        <div className="flex size-6 items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">
          X1
        </div>
        <span className="text-sm font-semibold tracking-tight">CBO Club</span>
      </div>

      <nav className="thin-scroll flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {NAV_SECTIONS.map((section, index) => {
          const visible = section.items.filter(
            (item) => !item.readGroup || canRead(role, item.readGroup)
          );
          if (!visible.length) return null;

          return (
            <div key={section.label ?? `section-${index}`}>
              {section.label && (
                <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  if (item.soon) {
                    return (
                      <li key={item.href}>
                        <span
                          title="Em construção"
                          className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground/40"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
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
        <p className="text-[10px] text-muted-foreground/60">
          Fase 1 · Fundação + Ofertas
        </p>
      </div>
    </aside>
  );
}
