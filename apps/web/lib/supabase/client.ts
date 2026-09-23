import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Provide a mock or fallback object if environment is not yet configured
    console.warn("Supabase public credentials not set. Ensure .env.local is configured.");
  }

  return createBrowserClient(
    supabaseUrl || "https://placeholder-project.supabase.co",
    supabaseKey || "placeholder-anon-key"
  );
}
