// ============================================================
// TAKEOFF MODULE — PLAN SETS API ROUTE
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/app/api/plan-sets/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { fetchPlanSets, createPlanSet } from '@/lib/supabase/takeoff-queries'

const CreatePlanSetSchema = z.object({
  project_id: z.string().uuid('project_id must be a valid UUID'),
  name: z.string().min(1, 'Name is required').max(200),
  version: z.string().optional(),
})

function getServerSupabase() {
  const cookieStore = cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServerClient(url, key, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('project_id')
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'project_id query param is required' },
        { status: 400 }
      )
    }

    const planSets = await fetchPlanSets(projectId)
    return NextResponse.json({ success: true, data: planSets })
  } catch (err) {
    console.error('[GET /api/plan-sets]', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreatePlanSetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const planSet = await createPlanSet(parsed.data, user.id)
    return NextResponse.json({ success: true, data: planSet }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/plan-sets]', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
