"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { validateAvatarFile } from "@/lib/profile/avatar";
import { UserAvatar } from "./UserAvatar";

interface AvatarUploadProps {
  name: string;
  currentAvatarUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  size?: "lg" | "xl";
}

export function AvatarUpload({
  name,
  currentAvatarUrl,
  onFileSelect,
  onRemove,
  disabled = false,
  size = "xl",
}: AvatarUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) {
      onFileSelect(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    const validation = validateAvatarFile(file);
    if (validation) {
      setError(validation);
      e.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelect(file);
  }

  function handleRemove() {
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  }

  const displayUrl = previewUrl ?? currentAvatarUrl ?? null;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <UserAvatar name={name} avatarUrl={displayUrl} size={size} />

      <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled}
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            className="w-auto px-4"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {displayUrl ? "Change photo" : "Add photo"}
          </Button>
          {(displayUrl || currentAvatarUrl) && onRemove && (
            <Button
              type="button"
              variant="ghost"
              className="w-auto px-4 text-red-600"
              disabled={disabled}
              onClick={handleRemove}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--muted)]">
          JPG, PNG, WebP, or GIF · max 5 MB
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
