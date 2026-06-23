import type { WhatsappGroupRole } from "@/lib/types";

export function getDefaultAppPath(profile: {
  onboarding_complete: boolean;
  whatsapp_group_role: WhatsappGroupRole;
} | null): string {
  if (!profile?.onboarding_complete) return "/onboarding";
  if (profile.whatsapp_group_role === "admin") return "/admin";
  return "/";
}
