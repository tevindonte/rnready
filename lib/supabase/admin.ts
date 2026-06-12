import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, requireSupabaseServiceKey } from "@/lib/supabase/env";

export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = requireSupabaseServiceKey();
  return createClient(url, key);
}
