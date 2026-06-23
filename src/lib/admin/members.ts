import type { WhatsappGroupRole } from "@/lib/types";

/** Platform members only — admin accounts are excluded from group metrics. */
export function isPlatformMember(role: WhatsappGroupRole): boolean {
  return role !== "admin";
}

export const PLATFORM_MEMBER_ROLE = "member" as const;
