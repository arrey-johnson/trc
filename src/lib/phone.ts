/** Normalize to E.164-ish format with leading + */
export function normalizeWhatsAppNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  return input.trim().startsWith("+") ? `+${digits}` : `+${digits}`;
}

export function isValidPassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}
