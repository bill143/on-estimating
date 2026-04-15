// ============================================================
// TAKEOFF MODULE — TAKEOFFS API ROUTE
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/app/api/takeoffs/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { fetchTakeoffs, createTakeoff } from '@/lib/supabase/takeoff-queries'

const CreateTakeoffSchema = z.object({
  project_id: z.string().uuid(),
  plan_set_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
})

function getServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const projectId = request.nextUrl.searchParams.get('project_id')
    if (!projectId) return NextResponse.json({ success: false, error: 'project_id required' }, { status: 400 })

    const takeoffs = await fetchTakeoffs(projectId)
    return NextResponse.json({ success: true, data: takeoffs })
  } catch (err) {
    console.error('[GET /api/takeoffs]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = CreateTakeoffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const takeoff = await createTakeoff(parsed.data, user.id)
    return NextResponse.json({ success: true, data: takeoff }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/takeoffs]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
