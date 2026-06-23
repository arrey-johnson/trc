"use client";

import { useTransition } from "react";
import { adminDeleteForumPost } from "@/app/forum/actions";
import { Button } from "@/components/ui";

export function DeletePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      className="w-auto px-3 py-1.5 text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this post?")) return;
        startTransition(async () => {
          await adminDeleteForumPost(postId);
        });
      }}
    >
      Delete
    </Button>
  );
}
