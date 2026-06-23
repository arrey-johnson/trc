import type { CommitmentTier } from "@/lib/admin/commitment";
import { TIER_LABELS, TIER_STYLES } from "@/lib/admin/commitment";

export function CommitmentBadge({
  tier,
  className = "",
}: {
  tier: CommitmentTier;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]} ${className}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
