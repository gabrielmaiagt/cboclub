"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createSession } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureAuthPersistence } from "@/lib/firebase/client";

/**
 * Login.
 *
 * O SDK cliente autentica e devolve um ID token; o servidor troca esse
 * token por um cookie de sessao httpOnly. O token nunca fica guardado no
 * navegador de forma acessivel a JavaScript.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);

  async function establishSession(idToken: string) {
    const result = await createSession(idToken);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível entrar.");
      return false;
    }
    toast.success(`Bem-vindo, ${result.data?.fullName ?? ""}`.trim());
    router.replace("/ofertas");
    router.refresh();
    return true;
  }

  function describeError(error: unknown): string {
    const code = (error as { code?: string })?.code ?? "";
    if (code.includes("invalid-credential") || code.includes("wrong-password")) {
      return "E-mail ou senha incorretos.";
    }
    if (code.includes("user-not-found")) return "Usuário não encontrado.";
    if (code.includes("too-many-requests")) {
      return "Muitas tentativas. Aguarde alguns minutos.";
    }
    if (code.includes("popup-closed")) return "Login cancelado.";
    if (code.includes("network")) return "Sem conexão com o Firebase.";
    return error instanceof Error ? error.message : "Erro ao entrar.";
  }

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading("email");
    try {
      const auth = await ensureAuthPersistence();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken();
      await establishSession(idToken);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogleLogin() {
    setLoading("google");
    try {
      const auth = await ensureAuthPersistence();
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();
      await establishSession(idToken);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-6">
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@cboclub.com"
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {loading === "email" && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={busy}
      >
        {loading === "google" && <Loader2 className="size-4 animate-spin" />}
        Continuar com Google
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">
        O primeiro usuário a entrar vira owner. Os demais entram como viewer e
        precisam ser promovidos.
      </p>
    </div>
  );
}
