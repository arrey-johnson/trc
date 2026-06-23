import type { MutableRefObject } from "react";
import { formatPostDate, forumCategoryLabel } from "@/lib/forum";

export interface PostShareData {
  authorName: string;
  body: string;
  category: string;
  createdAt: string;
  timezone: string;
}

export function PostSharePreview({
  data,
  innerRef,
}: {
  data: PostShareData;
  innerRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const initial = (data.authorName || "?")[0]?.toUpperCase();

  return (
    <div
      ref={innerRef}
      className="pointer-events-none fixed -left-[9999px] top-0 z-[-1] w-[380px] overflow-hidden rounded-3xl bg-white text-stone-900 shadow-xl"
      aria-hidden
    >
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
          The Reset Circle
        </p>
        <p className="mt-1 text-lg font-bold">Forum</p>
      </div>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-stone-900">{data.authorName}</p>
            <p className="text-xs text-stone-500">
              {formatPostDate(data.createdAt, data.timezone)} ·{" "}
              {forumCategoryLabel(data.category)}
            </p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[17px] leading-relaxed text-stone-800">
          {data.body}
        </p>
      </div>
      <div className="border-t border-stone-200 px-5 py-3 text-center text-xs text-stone-400">
        theresetcircle.app
      </div>
    </div>
  );
}
