import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { getAuthContext } from "@/lib/auth/guard";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const ctx = await getAuthContext();
  if (ctx) redirect("/ofertas");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded bg-foreground text-xs font-bold text-background">
            X1
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">CBO Club</p>
            <p className="text-xs text-muted-foreground">
              Sistema operacional da empresa
            </p>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
