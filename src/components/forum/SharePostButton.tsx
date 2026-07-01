"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

function stopModalAction(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  function closeModal(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
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

  async function handleSave(e: React.MouseEvent) {
    stopModalAction(e);
    setBusy(true);
    setError(null);
    const url = await capturePreview();
    setBusy(false);
    if (!url) return;
    await downloadImage(url, "reset-circle-post.png");
  }

  async function handleShare(e: React.MouseEvent) {
    stopModalAction(e);
    setBusy(true);
    setError(null);
    const url = await capturePreview();
    setBusy(false);
    if (!url) return;
    const file = await dataUrlToFile(url, "reset-circle-post.png");
    const shared = await shareImageFile(file, "The Reset Circle post");
    if (!shared) await downloadImage(url, "reset-circle-post.png");
  }

  const modal =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
        onClick={closeModal}
        onMouseDown={stopModalAction}
        role="dialog"
        aria-modal="true"
        aria-label="Share post"
      >
        <div
          className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl"
          onClick={stopModalAction}
          onMouseDown={stopModalAction}
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
    ) : null;

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

      {modal && createPortal(modal, document.body)}
    </>
  );
}
