import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UpdatePrompt from "@/components/pwa/UpdatePrompt";
import QueryProvider from "@/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "청파중앙교회 교육위원회",
  description: "교육위원회 통합 관리 시스템 - 출결 관리, 주차 보고서, 전자 결재",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "청파중앙교회",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Supabase preconnect - LCP 및 네트워크 의존성 개선 */}
        <link rel="preconnect" href="https://zikneyjidzovvkmflibo.supabase.co" />
        <link rel="dns-prefetch" href="https://zikneyjidzovvkmflibo.supabase.co" />

        {/* PWA */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
        <UpdatePrompt />
      </body>
    </html>
  );
}
