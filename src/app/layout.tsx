import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/system/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "伯仲叔教育管理",
  description: "伯杨、仲杨、叔杨的私有家庭教育日程与成长管理应用。",
  applicationName: "伯仲叔教育管理",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "伯仲叔教育",
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
