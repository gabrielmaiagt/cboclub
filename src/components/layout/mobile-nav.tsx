"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { ADMIN_NAV_ITEMS, NAV_SECTIONS } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { canRead } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/domain";

/**
 * Navegacao mobile (§58): o desktop tem a sidebar fixa, mas ela some em
 * telas pequenas. Sem isso o usuario no celular ficava sem forma de
 * trocar de modulo — so conseguia navegar clicando em links dentro de
 * uma pagina ja aberta.
 */
export function MobileNav({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const allItems = [...NAV_SECTIONS.flatMap((s) => s.items), ...ADMIN_NAV_ITEMS];

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="size-4" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b border-border/60 px-4 py-3.5">
            <SheetTitle className="flex items-center gap-2.5 text-left text-sm">
              <div className="flex size-6 items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">
                X1
              </div>
              CBO Club
            </SheetTitle>
          </SheetHeader>
          <nav className="thin-scroll flex-1 space-y-1 overflow-y-auto p-3">
            {allItems
              .filter((item) => !item.readGroup || canRead(role, item.readGroup))
              .map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent/60"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
