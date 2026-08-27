"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { globalSearchAction } from "@/app/actions/search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchResult } from "@/services/firestore/search.repo";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  oferta: "Ofertas",
  copy: "Copies",
  criativo: "Criativos",
  chip: "Chips",
  referencia: "Referências",
  mineracao: "Mineração",
};

/**
 * Busca global (§53). Volume pequeno: cada tecla dispara uma server
 * action que filtra em memoria — sem mecanismo de full-text dedicado.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const data = await globalSearchAction(query);
      if (!cancelled) {
        setResults(data);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function select(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const grouped = new Map<SearchResult["type"], SearchResult[]>();
  for (const r of results) {
    const list = grouped.get(r.type) ?? [];
    list.push(r);
    grouped.set(r.type, list);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-full max-w-md items-center rounded-lg border border-border/60 bg-background/60 pl-9 pr-3 text-left text-sm text-muted-foreground/60 outline-none transition-colors hover:border-border"
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        Buscar oferta, criativo, chip...
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border/60 px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar oferta, código, copy, criativo, chip, referência, mineração..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length < 2 ? (
            <CommandEmpty>Digite ao menos 2 letras.</CommandEmpty>
          ) : loading ? (
            <CommandEmpty>Buscando...</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>Nada encontrado.</CommandEmpty>
          ) : (
            [...grouped.entries()].map(([type, items]) => (
              <CommandGroup key={type} heading={TYPE_LABELS[type]}>
                {items.map((r) => (
                  <CommandItem key={`${r.type}-${r.code}`} onSelect={() => select(r.href)}>
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">{r.subtitle}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
