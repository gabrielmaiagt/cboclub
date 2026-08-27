import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto generico de pagina: cabecalho + linhas de card/tabela.
 * Usado em `loading.tsx` de rotas simples e em Suspense boundaries
 * internas de paginas mais pesadas — melhor que tela em branco
 * enquanto os dados vem do Firestore.
 */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Grade de cards curtos — Visao Geral, resumos com StatCard. */
export function StatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-lg" />
      ))}
    </div>
  );
}
