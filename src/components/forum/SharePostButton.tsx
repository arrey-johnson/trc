"use client";

import { useRef, useState, useTransition } from "react";
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpen(e: React.MouseEvent) {
    onClick?.(e);
    e.preventDefault();
    e.stopPropagation();

    setError(null);
    startTransition(async () => {
      const node = previewRef.current;
      if (!node) {
        setError("Could not create image.");
        return;
      }
      try {
        const url = await captureElementAsPng(node);
        setImageUrl(url);
      } catch {
        setError("Could not capture post. Try again.");
      }
    });
  }

  function closeModal() {
    setImageUrl(null);
    setError(null);
  }

  async function handleSave() {
    if (!imageUrl) return;
    await downloadImage(imageUrl, "reset-circle-post.png");
  }

  async function handleShare() {
    if (!imageUrl) return;
    const file = await dataUrlToFile(imageUrl, "reset-circle-post.png");
    const shared = await shareImageFile(file, "The Reset Circle post");
    if (!shared) await handleSave();
  }

  return (
    <>
      <PostSharePreview data={data} innerRef={previewRef} />

      <button
        type="button"
        onClick={handleOpen}
        disabled={pending}
        aria-label="Share post as image"
        className={className}
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {error && (
        <p className="mt-1 text-xs text-red-600" onClick={(e) => e.stopPropagation()}>
          {error}
        </p>
      )}

      {imageUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Share post"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-sm font-semibold text-[var(--foreground)]">
              Share this post
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Post preview"
              className="mx-auto max-h-[50vh] w-full rounded-xl border border-[var(--border)] object-contain"
            />
            <div className="mt-4 space-y-2">
              <Button type="button" onClick={handleShare}>
                Share to WhatsApp or elsewhere
              </Button>
              <Button type="button" variant="secondary" onClick={handleSave}>
                Save image
              </Button>
              <Button type="button" variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
