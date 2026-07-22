
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Controle Patrimonial",
  description: "Gerenciamento de Aluguéis e Empréstimos",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gestão Patrimonial",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

import BottomNav from "@/components/BottomNav";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ToastProvider";

import SystemHealthCheck from "@/components/SystemHealthCheck";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <ServiceWorkerRegister />
        <SystemHealthCheck />
        <ToastProvider>
          <AuthProvider>
            <AppProvider>
              <main className="pb-24">
                {children}
              </main>
              <BottomNav />
            </AppProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
