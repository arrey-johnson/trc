/** iOS native splash before the web view paints (installed PWA). */
export function SplashStartupLinks() {
  return (
    <>
      <link rel="preload" href="/splash/splash.png" as="image" />
      <link
        rel="apple-touch-startup-image"
        href="/splash/ios-1170x2532.png"
        media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/ios-1284x2778.png"
        media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/ios-750x1334.png"
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
      />
      <link rel="apple-touch-startup-image" href="/splash/splash.png" />
    </>
  );
}
