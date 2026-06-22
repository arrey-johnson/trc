import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/BottomNav";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Habit Tracker app",
  description:
    "Daily accountability check-ins for your group — log, report, share.",
  applicationName: "Habit Tracker app",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Habit Tracker app",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <ServiceWorkerRegistration />
        <NavigationProgress />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
