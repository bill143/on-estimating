// ============================================================
// TAKEOFF MODULE — QA SUMMARY API ROUTE
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/app/api/takeoffs/[id]/qa-summary/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { fetchTakeoffQASummary } from '@/lib/supabase/takeoff-queries'

function getServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

interface RouteParams {
  params: { id: string }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await fetchTakeoffQASummary(params.id)
    return NextResponse.json({ success: true, data: summary })
  } catch (err) {
    console.error('[GET /api/takeoffs/[id]/qa-summary]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
