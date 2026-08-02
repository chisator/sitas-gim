import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SITAS FITNESS",
  description: "SITAS FITNESS",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  // Next sirve el manifest en /manifest.webmanifest (app/manifest.ts).
  // Apuntar a /manifest.json daba 404 y Android no ofrecía instalar la app.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SITAS FITNESS",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <div className="pb-16 md:pb-0">
          {children}
        </div>
        <Toaster />
        <BottomNav />
      </body>
    </html>
  );
}
