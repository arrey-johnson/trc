const CATEGORY_LABELS: Record<string, string> = {
  personal_development: "Personal development",
  mindset: "Mindset",
  habits: "Habits",
  faith: "Faith & purpose",
};

export function forumCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

export function formatPostDate(iso: string, timezone = "Africa/Douala"): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function postExcerpt(body: string, maxLength = 140): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}
