import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getAuthContext } from "@/lib/auth/guard";

/**
 * Shell do app.
 *
 * Server component: valida a sessao antes de renderizar qualquer coisa.
 * Quem nao tem sessao valida nunca ve o HTML das telas internas.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar role={ctx.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={ctx.user} />
        <main className="thin-scroll flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-5 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
