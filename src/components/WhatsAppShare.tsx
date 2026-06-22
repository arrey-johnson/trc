"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

interface WhatsAppShareProps {
  report: string;
}

export function WhatsAppShare({ report }: WhatsAppShareProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: report });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    const url = `https://wa.me/?text=${encodeURIComponent(report)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="space-y-4">
      <p className="text-sm font-medium text-stone-700">Your report is ready</p>
      <textarea
        readOnly
        value={report}
        rows={14}
        className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-3 font-mono text-sm leading-relaxed text-stone-800"
      />
      <Button onClick={handleShare}>Send to Group</Button>
      <Button variant="secondary" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy report"}
      </Button>
      <p className="text-xs text-stone-500">
        &quot;Send to Group&quot; opens WhatsApp with this message pre-filled.
        Pick your group chat and tap send — one tap, keeps you in control.
      </p>
    </Card>
  );
}
