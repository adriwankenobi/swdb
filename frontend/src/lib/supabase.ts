import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  // Surfaced once at startup if env vars are missing in a build.
  console.warn("Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient(url, publishableKey);
