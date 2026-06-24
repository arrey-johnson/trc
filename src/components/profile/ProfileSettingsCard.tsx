"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Button, Card, Input, Label } from "@/components/ui";
import {
  removeUserAvatar,
  resolveAvatarUrl,
  uploadUserAvatar,
} from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

export function ProfileSettingsCard({ profile }: { profile: User }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarPath, setAvatarPath] = useState(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentAvatarUrl = removeAvatar
    ? null
    : resolveAvatarUrl(supabase, avatarPath);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      setSaving(false);
      return;
    }

    let nextAvatarPath: string | null = avatarPath;

    if (removeAvatar && avatarPath) {
      const { error: removeError } = await removeUserAvatar(supabase, avatarPath);
      if (removeError) {
        setError(removeError);
        setSaving(false);
        return;
      }
      nextAvatarPath = null;
    } else if (avatarFile) {
      const { path, error: uploadError } = await uploadUserAvatar(
        supabase,
        profile.id,
        avatarFile
      );
      if (uploadError || !path) {
        setError(uploadError ?? "Could not upload photo.");
        setSaving(false);
        return;
      }
      nextAvatarPath = path;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        display_name: trimmedName,
        avatar_url: nextAvatarPath,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await supabase.auth.updateUser({
      data: { display_name: trimmedName },
    });

    setAvatarPath(nextAvatarPath);
    setAvatarFile(null);
    setRemoveAvatar(false);
    setSaving(false);
    setMessage("Profile saved.");
    router.refresh();
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold text-[var(--foreground)]">Profile</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your name and photo appear in the forum and on your reports.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <AvatarUpload
          name={displayName || profile.email}
          currentAvatarUrl={currentAvatarUrl}
          onFileSelect={(file) => {
            setAvatarFile(file);
            if (file) setRemoveAvatar(false);
          }}
          onRemove={() => {
            setRemoveAvatar(true);
            setAvatarFile(null);
          }}
          disabled={saving}
        />

        <div>
          <Label htmlFor="profile-display-name">Your name</Label>
          <Input
            id="profile-display-name"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Arrey J."
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
