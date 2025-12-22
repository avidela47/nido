import type { Metadata } from "next";
import "./globals.css";
import AppShell from "../components/layout/AppShell";
import { ToastProvider } from "../components/ui/Toast";

export const metadata: Metadata = {
  title: "Nido — Donde el dinero encuentra orden",
  description: "Finanzas del hogar con imputación simple por persona.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}


