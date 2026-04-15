// ============================================================
// TAKEOFF MODULE — TAKEOFF ITEMS API ROUTE
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/app/api/takeoffs/[id]/items/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import {
  fetchTakeoffItems,
  createTakeoffItem,
  updateTakeoffItem,
  deleteTakeoffItem,
  approveTakeoffItem,
  flagTakeoffItem,
  overrideTakeoffItem,
  batchCreateTakeoffItems,
} from '@/lib/supabase/takeoff-queries'

const ShapeGeometrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('polygon'),
    points: z.array(z.object({ x: z.number(), y: z.number() })),
    area_px2: z.number(),
  }),
  z.object({
    type: z.literal('polyline'),
    points: z.array(z.object({ x: z.number(), y: z.number() })),
    length_px: z.number(),
  }),
  z.object({
    type: z.literal('rectangle'),
    left: z.number(),
    top: z.number(),
    width: z.number(),
    height: z.number(),
    area_px2: z.number(),
  }),
  z.object({
    type: z.literal('count'),
    points: z.array(z.object({ x: z.number(), y: z.number() })),
    count: z.number(),
  }),
  z.object({
    type: z.literal('point'),
    points: z.array(z.object({ x: z.number(), y: z.number() })),
    count: z.literal(1),
  }),
])

const CreateItemSchema = z.object({
  plan_sheet_id: z.string().uuid(),
  shape_type: z.enum(['polygon', 'polyline', 'rectangle', 'count', 'point']),
  geometry: ShapeGeometrySchema,
  quantity: z.number().min(0),
  unit: z.enum(['SF', 'SY', 'LF', 'EA', 'CY', 'CF', 'TON', 'LB', 'GAL', 'LS']),
  csi_code: z.string(),
  csi_description: z.string(),
  label: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(['ai_detected', 'pending_review', 'approved', 'flagged', 'overridden']).optional(),
})

const UpdateItemSchema = z.object({
  geometry: ShapeGeometrySchema.optional(),
  quantity: z.number().min(0).optional(),
  unit: z.enum(['SF', 'SY', 'LF', 'EA', 'CY', 'CF', 'TON', 'LB', 'GAL', 'LS']).optional(),
  csi_code: z.string().optional(),
  label: z.string().optional(),
  status: z.enum(['ai_detected', 'pending_review', 'approved', 'flagged', 'overridden']).optional(),
  override_qty: z.number().optional(),
  override_reason: z.string().optional(),
})

const QAActionSchema = z.object({
  action: z.enum(['approve', 'flag', 'override']),
  item_id: z.string().uuid(),
  override_qty: z.number().optional(),
  override_reason: z.string().optional(),
  reason: z.string().optional(),
})

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

// GET /api/takeoffs/[id]/items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const items = await fetchTakeoffItems(params.id)
    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    console.error('[GET /api/takeoffs/[id]/items]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/takeoffs/[id]/items
// Supports both single item and batch (pass { items: [...] } for batch)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Batch create
    if (Array.isArray(body.items)) {
      const items = z.array(CreateItemSchema).safeParse(body.items)
      if (!items.success) {
        return NextResponse.json({ success: false, error: 'Validation failed', details: items.error.errors }, { status: 400 })
      }
      const created = await batchCreateTakeoffItems(params.id, items.data, user.id)
      return NextResponse.json({ success: true, data: created }, { status: 201 })
    }

    // QA action
    if (body.action) {
      const parsed = QAActionSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Invalid QA action' }, { status: 400 })
      }
      const { action, item_id, override_qty, override_reason, reason } = parsed.data

      let updated
      if (action === 'approve') updated = await approveTakeoffItem(item_id, user.id)
      else if (action === 'flag') updated = await flagTakeoffItem(item_id, user.id, reason)
      else if (action === 'override') {
        if (override_qty === undefined || !override_reason) {
          return NextResponse.json({ success: false, error: 'override_qty and override_reason required' }, { status: 400 })
        }
        updated = await overrideTakeoffItem(item_id, user.id, override_qty, override_reason)
      }

      return NextResponse.json({ success: true, data: updated })
    }

    // Single create
    const parsed = CreateItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const created = await createTakeoffItem(params.id, parsed.data, user.id)
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/takeoffs/[id]/items]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/takeoffs/[id]/items?item_id=xxx
export async function PATCH(request: NextRequest, { params: _params }: RouteParams) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const itemId = request.nextUrl.searchParams.get('item_id')
    if (!itemId) return NextResponse.json({ success: false, error: 'item_id query param required' }, { status: 400 })

    const body = await request.json()
    const parsed = UpdateItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const updated = await updateTakeoffItem(itemId, parsed.data)
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /api/takeoffs/[id]/items]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/takeoffs/[id]/items?item_id=xxx
export async function DELETE(request: NextRequest, { params: _params }: RouteParams) {
  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const itemId = request.nextUrl.searchParams.get('item_id')
    if (!itemId) return NextResponse.json({ success: false, error: 'item_id query param required' }, { status: 400 })

    await deleteTakeoffItem(itemId)
    return NextResponse.json({ success: true, message: 'Item deleted' })
  } catch (err) {
    console.error('[DELETE /api/takeoffs/[id]/items]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
