"use client";

import { useEffect, useRef, useState } from "react";
import { ShareIcon } from "@/components/forum/ForumIcons";
import {
  PostSharePreview,
  type PostShareData,
} from "@/components/forum/PostSharePreview";
import { Button } from "@/components/ui";
import {
  captureElementAsPng,
  downloadImage,
  shareImageFile,
  dataUrlToFile,
} from "@/lib/share-post-image";

interface SharePostButtonProps {
  data: PostShareData;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function SharePostButton({
  data,
  className = "",
  onClick,
}: SharePostButtonProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleOpen(e: React.MouseEvent) {
    onClick?.(e);
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError(null);
    setBusy(false);
  }

  async function capturePreview(): Promise<string | null> {
    const node = previewRef.current;
    if (!node) {
      setError("Could not create image.");
      return null;
    }
    try {
      return await captureElementAsPng(node);
    } catch {
      setError("Could not capture post. Try again.");
      return null;
    }
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    const url = await capturePreview();
    setBusy(false);
    if (!url) return;
    await downloadImage(url, "reset-circle-post.png");
  }

  async function handleShare() {
    setBusy(true);
    setError(null);
    const url = await capturePreview();
    setBusy(false);
    if (!url) return;
    const file = await dataUrlToFile(url, "reset-circle-post.png");
    const shared = await shareImageFile(file, "The Reset Circle post");
    if (!shared) await downloadImage(url, "reset-circle-post.png");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Share post as image"
        className={className}
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {error && !open && (
        <p
          className="mt-1 text-xs text-red-600"
          onClick={(e) => e.stopPropagation()}
        >
          {error}
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Share post"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 shrink-0 text-center text-sm font-semibold text-[var(--foreground)]">
              Share this post
            </p>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex justify-center">
                <PostSharePreview data={data} innerRef={previewRef} />
              </div>
            </div>

            {error && (
              <p className="mt-2 shrink-0 text-center text-xs text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4 shrink-0 space-y-2">
              <Button type="button" disabled={busy} onClick={handleShare}>
                {busy ? "Preparing…" : "Share to WhatsApp or elsewhere"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={handleSave}
              >
                {busy ? "Preparing…" : "Save image"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={closeModal}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
