/** Map Supabase/PostgREST errors to user-friendly messages. */
export function friendlyDbError(message: string, code?: string): string {
  if (
    code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("Could not find the table")
  ) {
    return "Database not set up yet. Run supabase/setup.sql in your Supabase SQL Editor, then try again.";
  }
  if (message.includes("infinite recursion")) {
    return "Database policy error. Run supabase/migrations/003_fix_rls_recursion.sql in your Supabase SQL Editor, then try again.";
  }
  return message;
}
