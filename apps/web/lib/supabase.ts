import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@on/db';

export type TypedSupabaseClient = ReturnType<typeof createClient>;

export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for client-side usage
let browserClient: TypedSupabaseClient | null = null;

export function getSupabase() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
