"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BookUploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) {
      setFileName(null);
      setFileSize(null);
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please choose a PDF file.");
      setFileName(null);
      setFileSize(null);
      e.target.value = "";
      return;
    }

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("PDF must be 50 MB or smaller.");
      setFileName(null);
      setFileSize(null);
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const response = await fetch("/api/admin/books/upload", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as { error?: string; bookId?: string };

    if (!response.ok || result.error) {
      setError(result.error ?? "Upload failed. Please try again.");
      setLoading(false);
      return;
    }

    if (result.bookId) {
      router.push(`/admin/library/${result.bookId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Book title</Label>
        <Input id="title" name="title" required placeholder="e.g. Atomic Habits" />
      </div>
      <div>
        <Label htmlFor="author">Author</Label>
        <Input id="author" name="author" placeholder="Optional" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Short description" />
      </div>
      <div>
        <Label htmlFor="pdf">PDF file</Label>
        <input
          ref={fileRef}
          id="pdf"
          name="pdf"
          type="file"
          accept="application/pdf"
          required
          onChange={handleFileChange}
          className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
        {fileName && fileSize !== null && (
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            {fileName} · {formatFileSize(fileSize)}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="page_count">Page count</Label>
        <Input
          id="page_count"
          name="page_count"
          type="number"
          min={1}
          placeholder="Auto-detected on upload (enter manually if needed)"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
        <input type="checkbox" name="assign_all" defaultChecked className="rounded" />
        Assign to all onboarded members
      </label>
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || !fileName}>
        {loading ? "Uploading…" : "Upload book"}
      </Button>
    </form>
  );
}
