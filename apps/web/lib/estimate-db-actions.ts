'use client';

import { getSupabase } from './supabase';
import type {
  EstimateRow,
  EstimateHeader,
  EstimateState,
  RowType,
  Option,
  GenRequirementsRow,
  GenConditionsRow,
  SubBidScope,
} from './estimate-store';

// ─── Save entire estimate to Supabase ────────────────────────────────────
export async function saveEstimateToDb(
  estimateId: string,
  state: Pick<
    EstimateState,
    | 'header' | 'rows' | 'options'
    | 'generalRequirementsRows' | 'generalConditionsRows' | 'subBidScopes'
    | 'overheadPercent' | 'profitPercent' | 'bondPercent' | 'insurancePercent'
    | 'laborBurdenPercent' | 'contingencyPercent' | 'taxPercent' | 'totalBaseBid'
  >
) {
  const supabase = getSupabase();
  const {
    header, rows, options,
    generalRequirementsRows, generalConditionsRows, subBidScopes,
    overheadPercent, profitPercent, bondPercent, insurancePercent,
    laborBurdenPercent, contingencyPercent, taxPercent, totalBaseBid,
  } = state;

  // ── 1. Update estimate record (all rates + header fields) ──────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: estErr } = await (supabase.from('estimates') as any)
    .update({
      name: header.projectName,
      total: totalBaseBid,
      overhead_pct: overheadPercent,
      profit_pct: profitPercent,
      tax_pct: taxPercent,
      bond_pct: bondPercent,
      insurance_pct: insurancePercent,
      labor_burden_pct: laborBurdenPercent,
      contingency_pct: contingencyPercent,
      bid_date: header.bidDate || null,
      architect: header.architect || null,
      owner_name: header.owner || null,
      project_address: [header.address, header.city, header.state, header.zip].filter(Boolean).join(', ') || null,
      scope: header.scope || null,
      exclusions: header.exclusions || null,
      clarifications: header.clarifications || null,
      revision: header.revision || null,
    })
    .eq('id', estimateId);

  if (estErr) throw new Error(`Estimate update failed: ${(estErr as { message: string }).message}`);

  // ── 2. Upsert base line items (delete-then-insert) ────────────────
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

  await supabase.from('line_items').delete().eq('estimate_id', estimateId);
  if (lineItemPayloads.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: liErr } = await (supabase.from('line_items') as any).insert(lineItemPayloads);
    if (liErr) throw new Error(`Line items save failed: ${(liErr as { message: string }).message}`);
  }

  // ── 3. Save general requirements ──────────────────────────────────
  await supabase.from('gen_requirements').delete().eq('estimate_id', estimateId);
  if (generalRequirementsRows.length > 0) {
    const grPayloads = generalRequirementsRows.map((row, idx) => ({
      id: row.id,
      estimate_id: estimateId,
      description: row.description,
      qty: row.qty,
      unit: row.unit,
      mat_unit_cost: row.materialUnitCost,
      lab_unit_cost: row.laborUnitCost,
      total_cost: row.totalCost,
      sort_order: idx,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('gen_requirements') as any).insert(grPayloads);
    if (error) throw new Error(`Gen requirements save failed: ${(error as { message: string }).message}`);
  }

  // ── 4. Save general conditions ────────────────────────────────────
  await supabase.from('gen_conditions').delete().eq('estimate_id', estimateId);
  if (generalConditionsRows.length > 0) {
    const gcPayloads = generalConditionsRows.map((row, idx) => ({
      id: row.id,
      estimate_id: estimateId,
      description: row.description,
      duration: row.duration,
      duration_unit: row.durationUnit,
      unit_rate: row.unitRate,
      total_cost: row.totalCost,
      sort_order: idx,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('gen_conditions') as any).insert(gcPayloads);
    if (error) throw new Error(`Gen conditions save failed: ${(error as { message: string }).message}`);
  }

  // ── 5. Save sub bid scopes + sub bids ─────────────────────────────
  // Must delete bids first (FK), then scopes
  const { data: existingScopes } = await supabase
    .from('sub_bid_scopes')
    .select('id')
    .eq('estimate_id', estimateId);
  if (existingScopes && existingScopes.length > 0) {
    const scopeIds = existingScopes.map((s: { id: string }) => s.id);
    await supabase.from('sub_bids').delete().in('scope_id', scopeIds);
  }
  await supabase.from('sub_bid_scopes').delete().eq('estimate_id', estimateId);

  for (let si = 0; si < subBidScopes.length; si++) {
    const scope = subBidScopes[si];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: scopeErr } = await (supabase.from('sub_bid_scopes') as any).insert({
      id: scope.id,
      estimate_id: estimateId,
      csi_code: scope.csiCode,
      scope_description: scope.scopeDescription,
      sort_order: si,
    });
    if (scopeErr) throw new Error(`Sub bid scope save failed: ${(scopeErr as { message: string }).message}`);

    if (scope.bids.length > 0) {
      const bidPayloads = scope.bids.map((bid) => ({
        id: bid.id,
        scope_id: scope.id,
        sub_name: bid.subName,
        contact_info: bid.contactInfo,
        bid_amount: bid.bidAmount,
        bid_date: bid.bidDate,
        notes: bid.notes,
        is_selected: bid.isSelected,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: bidErr } = await (supabase.from('sub_bids') as any).insert(bidPayloads);
      if (bidErr) throw new Error(`Sub bids save failed: ${(bidErr as { message: string }).message}`);
    }
  }

  // ── 6. Save options (with their line items) ───────────────────────
  // Delete option line items first (FK), then options
  const { data: existingOptions } = await supabase
    .from('estimate_options')
    .select('id')
    .eq('estimate_id', estimateId);
  if (existingOptions && existingOptions.length > 0) {
    const optionIds = existingOptions.map((o: { id: string }) => o.id);
    await supabase.from('option_line_items').delete().in('option_id', optionIds);
  }
  await supabase.from('estimate_options').delete().eq('estimate_id', estimateId);

  for (let oi = 0; oi < options.length; oi++) {
    const option = options[oi];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: optErr } = await (supabase.from('estimate_options') as any).insert({
      id: option.id,
      estimate_id: estimateId,
      name: option.name,
      description: option.description,
      option_type: option.optionType,
      overhead_pct: option.overheadPercent,
      profit_pct: option.profitPercent,
      bond_pct: option.bondPercent,
      insurance_pct: option.insurancePercent,
      labor_burden_pct: option.laborBurdenPercent,
      contingency_pct: option.contingencyPercent,
      tax_pct: option.taxPercent,
      total_option_cost: option.totalOptionCost,
      sort_order: oi,
    });
    if (optErr) throw new Error(`Option save failed: ${(optErr as { message: string }).message}`);

    // Save option line items
    if (option.rows.length > 0) {
      const optLinePayloads = option.rows.map((row, idx) => ({
        id: row.id,
        option_id: option.id,
        row_type: row.rowType as string,
        parent_id: row.parentId,
        sort_order: idx,
        csi_code: row.csiCode,
        description: row.description,
        quantity: row.qty,
        unit: row.unit,
        sheet_no: row.sheetNo,
        detail_no: row.detailNo,
        waste_percent: row.wastePercent,
        material_unit_cost: row.materialUnitCost,
        labor_unit_cost: row.laborUnitCost,
        equipment_unit_cost: row.equipmentUnitCost,
        total_cost: row.totalCost,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: oliErr } = await (supabase.from('option_line_items') as any).insert(optLinePayloads);
      if (oliErr) throw new Error(`Option line items save failed: ${(oliErr as { message: string }).message}`);
    }

    // Save option gen requirements into gen_requirements with a prefixed id
    // (Options GR/GC are stored alongside the option, not in separate tables—
    //  we store them as JSON in the option row via a secondary write below)
  }

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

  // Fetch gen requirements
  const { data: grData } = await supabase
    .from('gen_requirements')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true });

  // Fetch gen conditions
  const { data: gcData } = await supabase
    .from('gen_conditions')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true });

  // Fetch sub bid scopes + bids
  const { data: scopeData } = await supabase
    .from('sub_bid_scopes')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true });

  let subBidScopes: SubBidScope[] = [];
  if (scopeData && scopeData.length > 0) {
    const scopeIds = scopeData.map((s: { id: string }) => s.id);
    const { data: bidData } = await supabase
      .from('sub_bids')
      .select('*')
      .in('scope_id', scopeIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subBidScopes = scopeData.map((scope: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bids = (bidData ?? []).filter((b: any) => b.scope_id === scope.id).map((b: any) => ({
        id: b.id,
        subName: b.sub_name ?? '',
        contactInfo: b.contact_info ?? '',
        bidAmount: Number(b.bid_amount ?? 0),
        bidDate: b.bid_date ?? '',
        notes: b.notes ?? '',
        isSelected: b.is_selected ?? false,
      }));
      const selectedBid = bids.find((b: { isSelected: boolean }) => b.isSelected);
      return {
        id: scope.id,
        csiCode: scope.csi_code ?? '',
        scopeDescription: scope.scope_description ?? '',
        bids,
        selectedBidId: selectedBid?.id ?? null,
        selectedAmount: selectedBid?.bidAmount ?? 0,
      };
    });
  }

  // Fetch options + option line items
  const { data: optData } = await supabase
    .from('estimate_options')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true });

  let options: Option[] = [];
  if (optData && optData.length > 0) {
    const optionIds = optData.map((o: { id: string }) => o.id);
    const { data: oliData } = await supabase
      .from('option_line_items')
      .select('*')
      .in('option_id', optionIds)
      .order('sort_order', { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options = optData.map((opt: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const optRows = (oliData ?? []).filter((r: any) => r.option_id === opt.id).map((item: any) => ({
        id: item.id,
        rowType: (item.row_type ?? 'line_item') as RowType,
        parentId: item.parent_id,
        sortOrder: item.sort_order,
        srNo: 0,
        sheetNo: item.sheet_no ?? '',
        detailNo: item.detail_no ?? '',
        csiCode: item.csi_code ?? '',
        description: item.description ?? '',
        qty: Number(item.quantity ?? 0),
        wastePercent: Number(item.waste_percent ?? 0),
        qtyWithWaste: 0,
        unit: item.unit ?? '',
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

      return {
        id: opt.id,
        name: opt.name ?? '',
        description: opt.description ?? '',
        optionType: (opt.option_type ?? 'add') as 'add' | 'deduct' | 'alternate',
        rows: optRows,
        generalRequirementsRows: [] as GenRequirementsRow[],
        generalConditionsRows: [] as GenConditionsRow[],
        overheadPercent: Number(opt.overhead_pct ?? 10),
        profitPercent: Number(opt.profit_pct ?? 10),
        bondPercent: Number(opt.bond_pct ?? 1.5),
        insurancePercent: Number(opt.insurance_pct ?? 2.0),
        laborBurdenPercent: Number(opt.labor_burden_pct ?? 0),
        contingencyPercent: Number(opt.contingency_pct ?? 0),
        taxPercent: Number(opt.tax_pct ?? 0),
        // Computed values — will be recalculated after loading
        estimateDirectCost: 0,
        totalMaterial: 0,
        totalLabor: 0,
        totalEquipment: 0,
        genRequirementsSubtotal: 0,
        genConditionsSubtotal: 0,
        directCostSubtotal: 0,
        laborBurdenAmount: 0,
        adjustedDirectCost: 0,
        overheadAmount: 0,
        profitAmount: 0,
        subtotalBeforeBondIns: 0,
        bondAmount: 0,
        insuranceAmount: 0,
        contingencyAmount: 0,
        taxAmount: 0,
        totalOptionCost: Number(opt.total_option_cost ?? 0),
        sectionRollups: [],
      } satisfies Option;
    });
  }

  // Map base line items to store types
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

  // Map gen requirements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generalRequirementsRows: GenRequirementsRow[] = (grData ?? []).map((r: any) => ({
    id: r.id,
    description: r.description ?? '',
    qty: Number(r.qty ?? 0),
    unit: r.unit ?? 'LS',
    materialUnitCost: Number(r.mat_unit_cost ?? 0),
    laborUnitCost: Number(r.lab_unit_cost ?? 0),
    totalCost: Number(r.total_cost ?? 0),
  }));

  // Map gen conditions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generalConditionsRows: GenConditionsRow[] = (gcData ?? []).map((r: any) => ({
    id: r.id,
    description: r.description ?? '',
    duration: Number(r.duration ?? 0),
    durationUnit: (r.duration_unit ?? 'months') as 'weeks' | 'months',
    unitRate: Number(r.unit_rate ?? 0),
    totalCost: Number(r.total_cost ?? 0),
  }));

  // Parse address back into components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const estData = est as any;
  const addressParts = (estData.project_address ?? '').split(', ');

  const header: EstimateHeader = {
    projectName: estData.name ?? '',
    revision: estData.revision ?? 'R0',
    address: addressParts[0] ?? '',
    city: addressParts[1] ?? '',
    state: addressParts[2] ?? '',
    zip: addressParts[3] ?? '',
    estimateDate: new Date().toISOString().split('T')[0],
    bidDate: estData.bid_date ?? '',
    architect: estData.architect ?? '',
    owner: estData.owner_name ?? '',
    estimator: 'Bill Asmar',
    totalBaseBid: Number(estData.total ?? 0),
    scope: estData.scope ?? '',
    exclusions: estData.exclusions ?? '',
    clarifications: estData.clarifications ?? '',
  };

  return {
    header,
    rows,
    options,
    generalRequirementsRows,
    generalConditionsRows,
    subBidScopes,
    overheadPercent: Number(estData.overhead_pct ?? 10),
    profitPercent: Number(estData.profit_pct ?? 10),
    bondPercent: Number(estData.bond_pct ?? 1.5),
    insurancePercent: Number(estData.insurance_pct ?? 2.0),
    laborBurdenPercent: Number(estData.labor_burden_pct ?? 0),
    contingencyPercent: Number(estData.contingency_pct ?? 0),
    taxPercent: Number(estData.tax_pct ?? 0),
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
