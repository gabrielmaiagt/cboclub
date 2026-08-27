import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

// A variavel NAO pode se chamar --font-sans: colidiria com o token do
// tema e criaria um ciclo de custom property (fonte cairia no serif).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CBO Club",
    template: "%s · CBO Club",
  },
  description: "Sistema operacional da empresa",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Dark mode fixo: ferramenta operacional usada o dia inteiro.
    // suppressHydrationWarning: algumas extensoes de navegador injetam
    // atributos no <html> (ex: data-umb-interceptor-ready) antes do React
    // hidratar. Isso nao vem do nosso codigo e nao ha como evitar — e o
    // fix oficialmente recomendado pelo React para esse cenario especifico.
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background font-sans text-foreground antialiased`}
        suppressHydrationWarning
      >
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
