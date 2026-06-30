"use client";

import { useMemo, useState } from "react";
import { MemberRow } from "@/components/admin/MemberRow";
import { CommitmentBadge } from "@/components/admin/CommitmentBadge";
import { Card, Input } from "@/components/ui";
import type { MemberStats } from "@/lib/admin/commitment";
import type { CommitmentTier } from "@/lib/admin/commitment";
import { TIER_LABELS } from "@/lib/admin/commitment";

const TIERS = Object.keys(TIER_LABELS) as CommitmentTier[];

export function PeopleDirectory({ members }: { members: MemberStats[] }) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<CommitmentTier | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (tierFilter !== "all" && m.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phoneNumber.includes(q)
      );
    });
  }, [members, query, tierFilter]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          People
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {members.filter((m) => m.onboardingComplete).length} onboarded members
          · tap for detail
        </p>
      </header>

      <div className="mb-4 space-y-3">
        <Input
          type="search"
          placeholder="Search name, email, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTierFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tierFilter === "all"
                ? "btn-primary text-xs font-semibold"
                : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
            }`}
          >
            All
          </button>
          {TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                tierFilter === tier
                  ? "ring-2 ring-brand ring-offset-1"
                  : ""
              }`}
            >
              <CommitmentBadge tier={tier} />
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-4 text-center text-sm text-[var(--muted)]">
          {members.length === 0
            ? "No members have joined yet."
            : "No members match your filters."}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
        </div>
      )}
    </>
  );
}
