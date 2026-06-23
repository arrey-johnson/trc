import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/BottomNav";
import { ChunkErrorHandler } from "@/components/ChunkErrorHandler";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { SplashDismiss } from "@/components/SplashDismiss";
import { SplashStartupLinks } from "@/components/SplashStartupLinks";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Reset Circle App",
  description:
    "Daily accountability check-ins for your group — log, report, share.",
  applicationName: "The Reset Circle App",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The Reset Circle App",
    startupImage: [
      {
        url: "/splash/ios-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/splash/ios-1284x2778.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "/splash/splash.png",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <SplashStartupLinks />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function h(){var s=document.getElementById('app-splash');if(s&&!s.classList.contains('app-splash--hide')){s.classList.add('app-splash--hide');setTimeout(function(){s.remove()},400)}}if(document.readyState==='complete')requestAnimationFrame(h);else window.addEventListener('load',h,{once:true});setTimeout(h,4000)})();`,
          }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased transition-colors duration-200">
        <div id="app-splash" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/splash/splash.png" alt="" />
        </div>
        <ThemeProvider>
          <SplashDismiss />
          <ChunkErrorHandler />
          <ServiceWorkerRegistration />
          <NavigationProgress />
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
