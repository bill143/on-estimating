'use client';

import { getSupabase } from './supabase';
import type { EstimateRow, EstimateHeader, RowType } from './estimate-store';

// ─── Save entire estimate to Supabase ────────────────────────────────────
export async function saveEstimateToDb(
  estimateId: string,
  header: EstimateHeader,
  rows: EstimateRow[],
  overheadPercent: number,
  profitPercent: number,
  totalBaseBid: number
) {
  const supabase = getSupabase();

  // 1. Update estimate record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: estErr } = await (supabase.from('estimates') as any)
    .update({
      name: header.projectName,
      total: totalBaseBid,
      overhead_percent: overheadPercent,
      profit_percent: profitPercent,
    })
    .eq('id', estimateId);

  if (estErr) throw new Error(`Estimate update failed: ${(estErr as { message: string }).message}`);

  // 2. Upsert line items
  const lineItemPayloads = rows.map((row, idx) => ({
    id: row.id,
    estimate_id: estimateId,
    row_type: row.rowType as string,
    csi_code: row.csiCode,
    description: row.description,
    quantity: row.qty,
    unit: row.unit,
    unit_cost: row.materialUnitCost + row.laborUnitCost,
    sheet_no: row.sheetNo,
    detail_no: row.detailNo,
    waste_percent: row.wastePercent,
    material_unit_cost: row.materialUnitCost,
    labor_unit_cost: row.laborUnitCost,
    equipment_unit_cost: row.equipmentUnitCost,
    total_cost: row.totalCost,
    sort_order: idx,
    parent_id: row.parentId,
  }));

  // Delete existing then insert fresh
  await supabase.from('line_items').delete().eq('estimate_id', estimateId);
  if (lineItemPayloads.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: liErr } = await (supabase.from('line_items') as any).insert(lineItemPayloads);
    if (liErr) throw new Error(`Line items save failed: ${(liErr as { message: string }).message}`);
  }

  // TODO: Save options, gen requirements, gen conditions to their respective tables
}

// ─── Load estimate from Supabase ─────────────────────────────────────────
export async function loadEstimateFromDb(estimateId: string) {
  const supabase = getSupabase();

  // Fetch estimate
  const { data: est, error: estErr } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', estimateId)
    .single();

  if (estErr || !est) throw new Error(`Estimate load failed: ${estErr?.message ?? 'Not found'}`);

  // Fetch line items
  const { data: items, error: liErr } = await supabase
    .from('line_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true });

  if (liErr) throw new Error(`Line items load failed: ${liErr.message}`);

  // Map to store types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: EstimateRow[] = (items ?? []).map((item: any) => ({
    id: item.id,
    rowType: (item.row_type ?? 'line_item') as RowType,
    parentId: item.parent_id,
    sortOrder: item.sort_order,
    srNo: 0,
    sheetNo: item.sheet_no ?? '',
    detailNo: item.detail_no ?? '',
    csiCode: item.csi_code,
    description: item.description,
    qty: Number(item.quantity),
    wastePercent: Number(item.waste_percent ?? 0),
    qtyWithWaste: 0,
    unit: item.unit,
    materialUnitCost: Number(item.material_unit_cost ?? 0),
    laborUnitCost: Number(item.labor_unit_cost ?? 0),
    equipmentUnitCost: Number(item.equipment_unit_cost ?? 0),
    totalUnitCost: 0,
    totalCost: Number(item.total_cost ?? 0),
    subTotal: 0,
    materialSubTotal: 0,
    laborSubTotal: 0,
    equipmentSubTotal: 0,
    isExpanded: true,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const estData = est as any;
  return {
    header: {
      projectName: estData.name,
      overheadPercent: Number(estData.overhead_percent ?? 10),
      profitPercent: Number(estData.profit_percent ?? 10),
    },
    rows,
  };
}

// ─── Create new estimate ─────────────────────────────────────────────────
export async function createEstimateInDb(projectId: string, name: string) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('estimates') as any)
    .insert({
      project_id: projectId,
      name,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) throw new Error((error as { message: string }).message);
  return data;
}

// ─── List estimates for a project ────────────────────────────────────────
export async function listEstimatesForProject(projectId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
