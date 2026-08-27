"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Erro global do shell (§63): mensagem legivel + acao de recuperar. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-8 text-status-danger" />
      <div>
        <p className="text-sm font-medium">Algo deu errado nesta tela</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tente novamente. Se persistir, avise um admin.
        </p>
      </div>
      <Button size="sm" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
