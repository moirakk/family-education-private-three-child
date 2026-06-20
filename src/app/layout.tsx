import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/system/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Education Management System",
  description: "A private family education schedule, growth, and resource management system.",
  applicationName: "Family Education Management System",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Family Education",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon"
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen font-sans antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
