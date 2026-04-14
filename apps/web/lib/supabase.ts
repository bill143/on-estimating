import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export type TypedSupabaseClient = ReturnType<typeof createClient>;

export function createClient() {
  return createSupabaseClient(
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
