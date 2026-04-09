import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// Database type will come from Supabase codegen; using any for now
type Database = any;

export const createServerSupabaseClient = createServerSupabase;

export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Record<string, unknown>)
            );
          } catch {
            // Called from Server Component — cookie setting is ignored
          }
        },
      },
    }
  );
}
