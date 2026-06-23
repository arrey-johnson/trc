"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadBook } from "@/app/library/actions";
import { Button, Input, Label } from "@/components/ui";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function BookUploadForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPageCount(null);
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      setPageCount(pdf.numPages);
    } catch {
      setPageCount(null);
      setError("Could not read PDF page count.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (pageCount) formData.set("page_count", String(pageCount));

    const result = await uploadBook(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    router.refresh();
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
          className="mt-1 block w-full text-sm text-[var(--foreground)]"
        />
        {pageCount && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Detected {pageCount} pages
          </p>
        )}
        <input type="hidden" name="page_count" value={pageCount ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
        <input type="checkbox" name="assign_all" defaultChecked className="rounded" />
        Assign to all onboarded members
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || !pageCount}>
        {loading ? "Uploading…" : "Upload book"}
      </Button>
    </form>
  );
}
