import type { Metadata } from "next";
import "./globals.css";
import AppShell from "../components/layout/AppShell";
import { ToastProvider } from "../components/ui/Toast";
import PWARegister from "../components/pwa/PWARegister";

export const metadata: Metadata = {
  title: "Nido — Donde el dinero encuentra orden",
  description: "Finanzas del hogar con orden, claridad y reportes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <PWARegister />
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
