import type { Metadata } from "next";
import "./globals.css";
import AppShell from "../components/layout/AppShell";
import { ToastProvider } from "../components/ui/Toast";
import PWARegister from "../components/pwa/PWARegister";
import { ThemeProvider } from "../components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "Nido — Donde el dinero encuentra orden",
  description: "Finanzas del hogar con orden, claridad y reportes.",
  icons: {
    icon: "/favicon.ico?v=3",
    shortcut: "/favicon.ico?v=3",
    apple: "/logo.png?v=3",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="apple-touch-icon" href="/logo.png?v=3" />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <PWARegister />
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}



