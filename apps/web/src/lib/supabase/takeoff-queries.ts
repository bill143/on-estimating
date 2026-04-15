// ============================================================
// TAKEOFF MODULE — SUPABASE QUERY LAYER
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/supabase/takeoff-queries.ts
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type {
  PlanSet,
  PlanSheet,
  Takeoff,
  TakeoffItem,
  TakeoffQASummary,
  CreatePlanSetRequest,
  CreateTakeoffRequest,
  CreateTakeoffItemRequest,
  UpdateTakeoffItemRequest,
  TakeoffItemStatus,
} from '@/types/takeoff.types'

// ─── Supabase client ─────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

// ─── Plan Sets ───────────────────────────────────────────────

export async function fetchPlanSets(projectId: string): Promise<PlanSet[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('plan_sets')
    .select(`
      *,
      sheets:plan_sheets(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`fetchPlanSets: ${error.message}`)
  return (data as PlanSet[]) ?? []
}

export async function fetchPlanSet(planSetId: string): Promise<PlanSet | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('plan_sets')
    .select(`
      *,
      sheets:plan_sheets(*)
    `)
    .eq('id', planSetId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`fetchPlanSet: ${error.message}`)
  }
  return data as PlanSet
}

export async function createPlanSet(
  request: CreatePlanSetRequest,
  userId: string
): Promise<PlanSet> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('plan_sets')
    .insert({
      project_id: request.project_id,
      name: request.name,
      version: request.version ?? '1.0',
      uploaded_by: userId,
      status: 'processing',
    })
    .select()
    .single()

  if (error) throw new Error(`createPlanSet: ${error.message}`)
  return data as PlanSet
}

export async function updatePlanSetSheetCount(
  planSetId: string,
  count: number
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('plan_sets')
    .update({ sheet_count: count, status: 'ready' })
    .eq('id', planSetId)

  if (error) throw new Error(`updatePlanSetSheetCount: ${error.message}`)
}

// ─── Plan Sheets ─────────────────────────────────────────────

export async function createPlanSheet(
  planSetId: string,
  sheet: Omit<PlanSheet, 'id' | 'plan_set_id' | 'created_at' | 'updated_at'>
): Promise<PlanSheet> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('plan_sheets')
    .insert({ ...sheet, plan_set_id: planSetId })
    .select()
    .single()

  if (error) throw new Error(`createPlanSheet: ${error.message}`)
  return data as PlanSheet
}

export async function updateSheetScaleRatio(
  sheetId: string,
  pixelsPerFoot: number,
  source: 'manual' | 'auto_detected'
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('plan_sheets')
    .update({ scale_ratio: pixelsPerFoot, scale_source: source })
    .eq('id', sheetId)

  if (error) throw new Error(`updateSheetScaleRatio: ${error.message}`)
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from('plan-sheets')
    .createSignedUrl(storagePath, 3600) // 1-hour expiry

  if (error || !data) throw new Error(`getSignedUrl: ${error?.message ?? 'no data'}`)
  return data.signedUrl
}

// ─── Takeoffs ────────────────────────────────────────────────

export async function fetchTakeoffs(projectId: string): Promise<Takeoff[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoffs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`fetchTakeoffs: ${error.message}`)
  return (data as Takeoff[]) ?? []
}

export async function fetchTakeoff(takeoffId: string): Promise<Takeoff | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoffs')
    .select('*')
    .eq('id', takeoffId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`fetchTakeoff: ${error.message}`)
  }
  return data as Takeoff
}

export async function createTakeoff(
  request: CreateTakeoffRequest,
  userId: string
): Promise<Takeoff> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoffs')
    .insert({
      project_id: request.project_id,
      plan_set_id: request.plan_set_id,
      name: request.name,
      description: request.description,
      created_by: userId,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw new Error(`createTakeoff: ${error.message}`)
  return data as Takeoff
}

export async function updateTakeoffStatus(
  takeoffId: string,
  status: Takeoff['status']
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('takeoffs')
    .update({ status })
    .eq('id', takeoffId)

  if (error) throw new Error(`updateTakeoffStatus: ${error.message}`)
}

// ─── Takeoff Items ────────────────────────────────────────────

export async function fetchTakeoffItems(takeoffId: string): Promise<TakeoffItem[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .select('*')
    .eq('takeoff_id', takeoffId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`fetchTakeoffItems: ${error.message}`)
  return (data as TakeoffItem[]) ?? []
}

export async function createTakeoffItem(
  takeoffId: string,
  item: CreateTakeoffItemRequest,
  userId: string
): Promise<TakeoffItem> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .insert({
      takeoff_id: takeoffId,
      plan_sheet_id: item.plan_sheet_id,
      shape_type: item.shape_type,
      geometry: item.geometry,
      quantity: item.quantity,
      unit: item.unit,
      csi_code: item.csi_code,
      csi_description: item.csi_description,
      label: item.label,
      confidence: item.confidence ?? 0.5,
      status: item.status ?? 'ai_detected',
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw new Error(`createTakeoffItem: ${error.message}`)
  return data as TakeoffItem
}

export async function updateTakeoffItem(
  itemId: string,
  updates: UpdateTakeoffItemRequest
): Promise<TakeoffItem> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`updateTakeoffItem: ${error.message}`)
  return data as TakeoffItem
}

export async function deleteTakeoffItem(itemId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('takeoff_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(`deleteTakeoffItem: ${error.message}`)
}

export async function approveTakeoffItem(
  itemId: string,
  reviewedBy: string
): Promise<TakeoffItem> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .update({
      status: 'approved' as TakeoffItemStatus,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`approveTakeoffItem: ${error.message}`)
  return data as TakeoffItem
}

export async function flagTakeoffItem(
  itemId: string,
  reviewedBy: string,
  reason?: string
): Promise<TakeoffItem> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .update({
      status: 'flagged' as TakeoffItemStatus,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      override_reason: reason,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`flagTakeoffItem: ${error.message}`)
  return data as TakeoffItem
}

export async function overrideTakeoffItem(
  itemId: string,
  reviewedBy: string,
  overrideQty: number,
  overrideReason: string
): Promise<TakeoffItem> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .update({
      status: 'overridden' as TakeoffItemStatus,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      override_qty: overrideQty,
      override_reason: overrideReason,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`overrideTakeoffItem: ${error.message}`)
  return data as TakeoffItem
}

// ─── QA Summary ──────────────────────────────────────────────

export async function fetchTakeoffQASummary(
  takeoffId: string
): Promise<TakeoffQASummary> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .select('status, confidence')
    .eq('takeoff_id', takeoffId)

  if (error) throw new Error(`fetchTakeoffQASummary: ${error.message}`)

  const items = data ?? []
  const total = items.length
  const counts = {
    ai_detected: 0,
    pending_review: 0,
    approved: 0,
    flagged: 0,
    overridden: 0,
  }

  let confidenceSum = 0
  let lowConfidenceCount = 0

  for (const item of items) {
    counts[item.status as keyof typeof counts] = (counts[item.status as keyof typeof counts] ?? 0) + 1
    confidenceSum += item.confidence ?? 0
    if ((item.confidence ?? 0) < 0.65) lowConfidenceCount++
  }

  const reviewed = counts.approved + counts.overridden
  const avgConfidence = total > 0 ? confidenceSum / total : 0
  const completionPct = total > 0 ? (reviewed / total) * 100 : 0

  return {
    takeoff_id: takeoffId,
    total_items: total,
    ai_detected: counts.ai_detected,
    pending_review: counts.pending_review,
    approved: counts.approved,
    flagged: counts.flagged,
    overridden: counts.overridden,
    avg_confidence: Math.round(avgConfidence * 100) / 100,
    low_confidence_count: lowConfidenceCount,
    completion_pct: Math.round(completionPct * 10) / 10,
  }
}

// ─── Batch operations ────────────────────────────────────────

export async function batchCreateTakeoffItems(
  takeoffId: string,
  items: CreateTakeoffItemRequest[],
  userId: string
): Promise<TakeoffItem[]> {
  const supabase = getSupabase()
  const rows = items.map((item, index) => ({
    takeoff_id: takeoffId,
    plan_sheet_id: item.plan_sheet_id,
    shape_type: item.shape_type,
    geometry: item.geometry,
    quantity: item.quantity,
    unit: item.unit,
    csi_code: item.csi_code,
    csi_description: item.csi_description,
    label: item.label,
    confidence: item.confidence ?? 0.5,
    status: item.status ?? 'ai_detected',
    sort_order: index,
    created_by: userId,
  }))

  const { data, error } = await supabase
    .from('takeoff_items')
    .insert(rows)
    .select()

  if (error) throw new Error(`batchCreateTakeoffItems: ${error.message}`)
  return (data as TakeoffItem[]) ?? []
}

export async function fetchApprovedItemsForProject(
  projectId: string
): Promise<TakeoffItem[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('takeoff_items')
    .select(`
      *,
      takeoff:takeoffs!inner(project_id)
    `)
    .eq('takeoffs.project_id', projectId)
    .in('status', ['approved', 'overridden'])
    .order('csi_code', { ascending: true })

  if (error) throw new Error(`fetchApprovedItemsForProject: ${error.message}`)
  return (data as TakeoffItem[]) ?? []
}
