"use client";

import { useEffect, useRef, useState } from "react";
import { ReactReader } from "react-reader";

interface EpubReaderProps {
  url: string;
  initialLocation: string | null;
  onProgressChange: (progress: {
    percent: number;
    epubLocation: string;
  }) => void;
}

export function EpubReader({
  url,
  initialLocation,
  onProgressChange,
}: EpubReaderProps) {
  const [location, setLocation] = useState(initialLocation ?? "0");
  const renditionRef = useRef<{ currentLocation: () => unknown } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function scheduleSave(epubLocation: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const rendition = renditionRef.current;
      if (!rendition) return;

      const current = rendition.currentLocation() as {
        start?: { percentage?: number };
      } | null;
      const percent = Math.round((current?.start?.percentage ?? 0) * 100);
      onProgressChange({
        percent: Math.max(0, Math.min(100, percent)),
        epubLocation,
      });
    }, 350);
  }

  return (
    <div className="relative h-[70vh] min-h-[28rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <ReactReader
        url={url}
        location={location}
        locationChanged={(epubcfi) => {
          setLocation(epubcfi);
          scheduleSave(epubcfi);
        }}
        getRendition={(rendition) => {
          renditionRef.current = rendition;
          rendition.flow("paginated");
        }}
        epubOptions={{
          flow: "paginated",
          manager: "default",
        }}
        swipeable
      />
    </div>
  );
}
