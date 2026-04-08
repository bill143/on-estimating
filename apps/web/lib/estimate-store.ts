'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateId } from './utils';

// ─── Row Types ───────────────────────────────────────────────────────────
export type RowType =
  | 'division_header'
  | 'subsection_header'
  | 'item_note'
  | 'line_item'
  | 'subtotal';

// ─── Line Item (expanded with Equipment column) ─────────────────────────
export interface EstimateRow {
  id: string;
  rowType: RowType;
  parentId: string | null;
  sortOrder: number;
  srNo: number;
  sheetNo: string;
  detailNo: string;
  csiCode: string;
  description: string;
  qty: number;
  wastePercent: number;
  qtyWithWaste: number;
  unit: string;
  materialUnitCost: number;
  laborUnitCost: number;
  equipmentUnitCost: number;
  totalUnitCost: number;
  totalCost: number;
  subTotal: number;
  materialSubTotal: number;
  laborSubTotal: number;
  equipmentSubTotal: number;
  isExpanded: boolean;
}

// ─── Estimate Header ─────────────────────────────────────────────────────
export interface EstimateHeader {
  projectName: string;
  revision: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  estimateDate: string;
  bidDate: string;
  architect: string;
  owner: string;
  estimator: string;
  totalBaseBid: number;
  scope: string;
  exclusions: string;
  clarifications: string;
}

// ─── Summary Section Rollup ──────────────────────────────────────────────
export interface SectionRollup {
  divisionId: string;
  csiCode: string;
  description: string;
  materialTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  totalCost: number;
}

// ─── General Requirements (Div 01) Row ───────────────────────────────────
export interface GenRequirementsRow {
  id: string;
  description: string;
  qty: number;
  unit: string;
  materialUnitCost: number;
  laborUnitCost: number;
  totalCost: number;
}

// ─── General Conditions Row ──────────────────────────────────────────────
export interface GenConditionsRow {
  id: string;
  description: string;
  duration: number;
  durationUnit: 'weeks' | 'months';
  unitRate: number;
  totalCost: number;
}

// ─── Subcontractor Bid ──────────────────────────────────────────────────
export interface SubBid {
  id: string;
  subName: string;
  contactInfo: string;
  bidAmount: number;
  bidDate: string;
  notes: string;
  isSelected: boolean;
}

export interface SubBidScope {
  id: string;
  csiCode: string;
  scopeDescription: string;
  bids: SubBid[];
  selectedBidId: string | null;
  selectedAmount: number;
}

// ─── Option (Self-contained mini-estimate) ───────────────────────────────
export interface Option {
  id: string;
  name: string;
  description: string;
  optionType: 'add' | 'deduct' | 'alternate';
  rows: EstimateRow[];
  generalRequirementsRows: GenRequirementsRow[];
  generalConditionsRows: GenConditionsRow[];
  overheadPercent: number;
  profitPercent: number;
  bondPercent: number;
  insurancePercent: number;
  laborBurdenPercent: number;
  contingencyPercent: number;
  taxPercent: number;
  // Computed
  estimateDirectCost: number;
  totalMaterial: number;
  totalLabor: number;
  totalEquipment: number;
  genRequirementsSubtotal: number;
  genConditionsSubtotal: number;
  directCostSubtotal: number;
  laborBurdenAmount: number;
  adjustedDirectCost: number;
  overheadAmount: number;
  profitAmount: number;
  subtotalBeforeBondIns: number;
  bondAmount: number;
  insuranceAmount: number;
  contingencyAmount: number;
  taxAmount: number;
  totalOptionCost: number;
  sectionRollups: SectionRollup[];
}

// ─── Store State ─────────────────────────────────────────────────────────
export interface EstimateState {
  header: EstimateHeader;
  rows: EstimateRow[];
  options: Option[];
  generalRequirementsRows: GenRequirementsRow[];
  generalConditionsRows: GenConditionsRow[];
  subBidScopes: SubBidScope[];

  // Rates
  overheadPercent: number;
  profitPercent: number;
  bondPercent: number;
  insurancePercent: number;
  laborBurdenPercent: number;
  contingencyPercent: number;
  taxPercent: number;

  // Computed totals
  estimateDirectCost: number;
  totalMaterial: number;
  totalLabor: number;
  totalEquipment: number;
  genRequirementsSubtotal: number;
  genConditionsSubtotal: number;
  directCostSubtotal: number;
  laborBurdenAmount: number;
  adjustedDirectCost: number;
  overheadAmount: number;
  profitAmount: number;
  subtotalBeforeBondIns: number;
  bondAmount: number;
  insuranceAmount: number;
  contingencyAmount: number;
  taxAmount: number;
  totalBaseBid: number;
  grandTotal: number;
  sectionRollups: SectionRollup[];

  // Base bid actions
  setHeader: (updates: Partial<EstimateHeader>) => void;
  addRow: (rowType: RowType, afterId?: string) => void;
  updateRow: (id: string, updates: Partial<EstimateRow>) => void;
  removeRow: (id: string) => void;
  moveRow: (id: string, direction: 'up' | 'down') => void;
  toggleExpand: (id: string) => void;
  setOverhead: (pct: number) => void;
  setProfit: (pct: number) => void;
  setBond: (pct: number) => void;
  setInsurance: (pct: number) => void;
  setLaborBurden: (pct: number) => void;
  setContingency: (pct: number) => void;
  setTax: (pct: number) => void;
  addGenRequirement: () => void;
  updateGenRequirement: (id: string, updates: Partial<GenRequirementsRow>) => void;
  removeGenRequirement: (id: string) => void;
  addGenCondition: () => void;
  updateGenCondition: (id: string, updates: Partial<GenConditionsRow>) => void;
  removeGenCondition: (id: string) => void;

  // Sub Bid actions
  addSubBidScope: () => void;
  removeSubBidScope: (scopeId: string) => void;
  updateSubBidScope: (scopeId: string, updates: Partial<Pick<SubBidScope, 'csiCode' | 'scopeDescription'>>) => void;
  addSubBid: (scopeId: string) => void;
  updateSubBid: (scopeId: string, bidId: string, updates: Partial<SubBid>) => void;
  removeSubBid: (scopeId: string, bidId: string) => void;
  selectWinningBid: (scopeId: string, bidId: string) => void;

  // Option actions
  addOption: () => void;
  removeOption: (id: string) => void;
  updateOptionMeta: (id: string, updates: Partial<Pick<Option, 'name' | 'description' | 'optionType' | 'overheadPercent' | 'profitPercent' | 'bondPercent' | 'insurancePercent' | 'laborBurdenPercent' | 'contingencyPercent' | 'taxPercent'>>) => void;
  addOptionRow: (optionId: string, rowType: RowType, afterId?: string) => void;
  updateOptionRow: (optionId: string, rowId: string, updates: Partial<EstimateRow>) => void;
  removeOptionRow: (optionId: string, rowId: string) => void;
  toggleOptionExpand: (optionId: string, rowId: string) => void;
  moveOptionRow: (optionId: string, rowId: string, direction: 'up' | 'down') => void;
  addOptionGR: (optionId: string) => void;
  updateOptionGR: (optionId: string, rowId: string, updates: Partial<GenRequirementsRow>) => void;
  removeOptionGR: (optionId: string, rowId: string) => void;
  addOptionGC: (optionId: string) => void;
  updateOptionGC: (optionId: string, rowId: string, updates: Partial<GenConditionsRow>) => void;
  removeOptionGC: (optionId: string, rowId: string) => void;

  recalculate: () => void;
  loadDemoEstimate: () => void;
}

// ─── Computation Helpers ─────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeRow(row: EstimateRow): EstimateRow {
  if (row.rowType !== 'line_item') return row;
  const qtyWithWaste = round2(row.qty * (1 + row.wastePercent / 100));
  const totalUnitCost = round2(row.materialUnitCost + row.laborUnitCost + row.equipmentUnitCost);
  const totalCost = round2(qtyWithWaste * totalUnitCost);
  return { ...row, qtyWithWaste, totalUnitCost, totalCost };
}

function makeRow(overrides: Partial<EstimateRow> & { rowType: RowType }): EstimateRow {
  const { rowType, ...rest } = overrides;
  return {
    id: generateId(),
    rowType,
    parentId: null,
    sortOrder: 0,
    srNo: 0,
    sheetNo: '',
    detailNo: '',
    csiCode: '',
    description: '',
    qty: 0,
    wastePercent: 0,
    qtyWithWaste: 0,
    unit: '',
    materialUnitCost: 0,
    laborUnitCost: 0,
    equipmentUnitCost: 0,
    totalUnitCost: 0,
    totalCost: 0,
    subTotal: 0,
    materialSubTotal: 0,
    laborSubTotal: 0,
    equipmentSubTotal: 0,
    isExpanded: true,
    ...rest,
  };
}

function makeOption(overrides?: Partial<Option>): Option {
  return {
    id: generateId(),
    name: '',
    description: '',
    optionType: 'add',
    rows: [],
    generalRequirementsRows: [],
    generalConditionsRows: [],
    overheadPercent: 10,
    profitPercent: 10,
    bondPercent: 1.5,
    insurancePercent: 2.0,
    laborBurdenPercent: 0,
    contingencyPercent: 0,
    taxPercent: 0,
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
    totalOptionCost: 0,
    sectionRollups: [],
    ...overrides,
  };
}

// ─── Shared row recalculation (used by base bid and options) ─────────────
function recalcRowData(rows: EstimateRow[]): {
  rows: EstimateRow[];
  sectionRollups: SectionRollup[];
  directCost: number;
  totalMaterial: number;
  totalLabor: number;
  totalEquipment: number;
} {
  let sr = 1;
  let updatedRows = rows.map((row) => {
    const updated = { ...row, srNo: sr++ };
    if (updated.rowType === 'line_item') {
      updated.qtyWithWaste = round2(updated.qty * (1 + updated.wastePercent / 100));
      updated.totalUnitCost = round2(updated.materialUnitCost + updated.laborUnitCost + updated.equipmentUnitCost);
      updated.totalCost = round2(updated.qtyWithWaste * updated.totalUnitCost);
    }
    return updated;
  });

  const divisionMap = new Map<
    string,
    { csiCode: string; description: string; matTotal: number; labTotal: number; eqTotal: number; costTotal: number }
  >();
  let currentDivisionId: string | null = null;

  for (const row of updatedRows) {
    if (row.rowType === 'division_header') {
      currentDivisionId = row.id;
      if (!divisionMap.has(row.id)) {
        divisionMap.set(row.id, { csiCode: row.csiCode, description: row.description, matTotal: 0, labTotal: 0, eqTotal: 0, costTotal: 0 });
      }
    } else if (row.rowType === 'line_item' && currentDivisionId) {
      const div = divisionMap.get(currentDivisionId);
      if (div) {
        div.matTotal = round2(div.matTotal + row.qtyWithWaste * row.materialUnitCost);
        div.labTotal = round2(div.labTotal + row.qtyWithWaste * row.laborUnitCost);
        div.eqTotal = round2(div.eqTotal + row.qtyWithWaste * row.equipmentUnitCost);
        div.costTotal = round2(div.costTotal + row.totalCost);
      }
    }
  }

  updatedRows = updatedRows.map((row, i) => {
    if (row.rowType === 'subtotal') {
      let sum = 0;
      for (let j = i - 1; j >= 0; j--) {
        const prev = updatedRows[j];
        if (prev.rowType === 'division_header' || prev.rowType === 'subtotal') break;
        if (prev.rowType === 'line_item') sum = round2(sum + prev.totalCost);
      }
      return { ...row, subTotal: sum };
    }
    if (row.rowType === 'division_header') {
      const div = divisionMap.get(row.id);
      return {
        ...row,
        subTotal: div ? div.costTotal : 0,
        materialSubTotal: div ? div.matTotal : 0,
        laborSubTotal: div ? div.labTotal : 0,
        equipmentSubTotal: div ? div.eqTotal : 0,
      };
    }
    return row;
  });

  const sectionRollups = Array.from(divisionMap.entries()).map(([divId, data]) => ({
    divisionId: divId,
    csiCode: data.csiCode,
    description: data.description,
    materialTotal: data.matTotal,
    laborTotal: data.labTotal,
    equipmentTotal: data.eqTotal,
    totalCost: data.costTotal,
  }));

  const directCost = round2(updatedRows.filter((r) => r.rowType === 'line_item').reduce((sum, r) => sum + r.totalCost, 0));
  const totalMaterial = round2(sectionRollups.reduce((s, r) => s + r.materialTotal, 0));
  const totalLabor = round2(sectionRollups.reduce((s, r) => s + r.laborTotal, 0));
  const totalEquipment = round2(sectionRollups.reduce((s, r) => s + r.equipmentTotal, 0));

  return { rows: updatedRows, sectionRollups, directCost, totalMaterial, totalLabor, totalEquipment };
}

// ─── Full cost cascade (shared by base bid and options) ──────────────────
function applyCostCascade(p: {
  directCost: number; totalMaterial: number; totalLabor: number;
  grSubtotal: number; gcSubtotal: number;
  laborBurdenPercent: number; overheadPercent: number; profitPercent: number;
  bondPercent: number; insurancePercent: number; contingencyPercent: number; taxPercent: number;
}) {
  const directCostSubtotal = round2(p.directCost + p.grSubtotal + p.gcSubtotal);
  const laborBurdenAmount = round2(p.totalLabor * (p.laborBurdenPercent / 100));
  const adjustedDirectCost = round2(directCostSubtotal + laborBurdenAmount);
  const overheadAmount = round2(adjustedDirectCost * (p.overheadPercent / 100));
  const profitAmount = round2(adjustedDirectCost * (p.profitPercent / 100));
  const subtotalBeforeBondIns = round2(adjustedDirectCost + overheadAmount + profitAmount);
  const bondAmount = round2(subtotalBeforeBondIns * (p.bondPercent / 100));
  const insuranceAmount = round2(subtotalBeforeBondIns * (p.insurancePercent / 100));
  const subtotalWithBondIns = round2(subtotalBeforeBondIns + bondAmount + insuranceAmount);
  const contingencyAmount = round2(subtotalWithBondIns * (p.contingencyPercent / 100));
  const taxAmount = round2(p.totalMaterial * (p.taxPercent / 100));
  const total = round2(subtotalWithBondIns + contingencyAmount + taxAmount);
  return { directCostSubtotal, laborBurdenAmount, adjustedDirectCost, overheadAmount, profitAmount, subtotalBeforeBondIns, bondAmount, insuranceAmount, contingencyAmount, taxAmount, total };
}

// ─── Option recalculation ────────────────────────────────────────────────
function recalcOptionData(option: Option): Option {
  const result = recalcRowData(option.rows);
  const grSubtotal = round2(option.generalRequirementsRows.reduce((sum, r) => sum + r.totalCost, 0));
  const gcSubtotal = round2(option.generalConditionsRows.reduce((sum, r) => sum + r.totalCost, 0));
  const cascade = applyCostCascade({
    directCost: result.directCost, totalMaterial: result.totalMaterial, totalLabor: result.totalLabor,
    grSubtotal, gcSubtotal,
    laborBurdenPercent: option.laborBurdenPercent, overheadPercent: option.overheadPercent,
    profitPercent: option.profitPercent, bondPercent: option.bondPercent,
    insurancePercent: option.insurancePercent, contingencyPercent: option.contingencyPercent,
    taxPercent: option.taxPercent,
  });
  return {
    ...option, rows: result.rows, sectionRollups: result.sectionRollups,
    estimateDirectCost: result.directCost, totalMaterial: result.totalMaterial,
    totalLabor: result.totalLabor, totalEquipment: result.totalEquipment,
    genRequirementsSubtotal: grSubtotal, genConditionsSubtotal: gcSubtotal,
    ...cascade, totalOptionCost: cascade.total,
  };
}

// ─── Master recalculation ────────────────────────────────────────────────
function recalcAll(state: EstimateState) {
  const result = recalcRowData(state.rows);
  state.rows = result.rows;
  state.sectionRollups = result.sectionRollups;
  state.estimateDirectCost = result.directCost;
  state.totalMaterial = result.totalMaterial;
  state.totalLabor = result.totalLabor;
  state.totalEquipment = result.totalEquipment;

  state.genRequirementsSubtotal = round2(state.generalRequirementsRows.reduce((sum, r) => sum + r.totalCost, 0));
  state.genConditionsSubtotal = round2(state.generalConditionsRows.reduce((sum, r) => sum + r.totalCost, 0));

  const cascade = applyCostCascade({
    directCost: state.estimateDirectCost, totalMaterial: state.totalMaterial, totalLabor: state.totalLabor,
    grSubtotal: state.genRequirementsSubtotal, gcSubtotal: state.genConditionsSubtotal,
    laborBurdenPercent: state.laborBurdenPercent, overheadPercent: state.overheadPercent,
    profitPercent: state.profitPercent, bondPercent: state.bondPercent,
    insurancePercent: state.insurancePercent, contingencyPercent: state.contingencyPercent,
    taxPercent: state.taxPercent,
  });

  state.directCostSubtotal = cascade.directCostSubtotal;
  state.laborBurdenAmount = cascade.laborBurdenAmount;
  state.adjustedDirectCost = cascade.adjustedDirectCost;
  state.overheadAmount = cascade.overheadAmount;
  state.profitAmount = cascade.profitAmount;
  state.subtotalBeforeBondIns = cascade.subtotalBeforeBondIns;
  state.bondAmount = cascade.bondAmount;
  state.insuranceAmount = cascade.insuranceAmount;
  state.contingencyAmount = cascade.contingencyAmount;
  state.taxAmount = cascade.taxAmount;
  state.totalBaseBid = cascade.total;
  state.header = { ...state.header, totalBaseBid: cascade.total };

  state.options = state.options.map((option) => recalcOptionData(option));

  const optionsTotal = state.options.reduce((sum, o) => sum + (o.optionType === 'deduct' ? -o.totalOptionCost : o.totalOptionCost), 0);
  state.grandTotal = round2(state.totalBaseBid + optionsTotal);
}

// ─── Zustand Store ───────────────────────────────────────────────────────
export const useEstimateStore = create<EstimateState>()(
  immer((set) => ({
    header: {
      projectName: '', revision: 'R0', address: '', city: '', state: '', zip: '',
      estimateDate: new Date().toISOString().split('T')[0], bidDate: '',
      architect: '', owner: '', estimator: 'Bill Asmar', totalBaseBid: 0,
      scope: '', exclusions: '', clarifications: '',
    },
    rows: [],
    options: [],
    generalRequirementsRows: [],
    generalConditionsRows: [],
    subBidScopes: [],
    overheadPercent: 10, profitPercent: 10, bondPercent: 1.5, insurancePercent: 2.0,
    laborBurdenPercent: 0, contingencyPercent: 5, taxPercent: 0,
    estimateDirectCost: 0, totalMaterial: 0, totalLabor: 0, totalEquipment: 0,
    directCostSubtotal: 0, genRequirementsSubtotal: 0, genConditionsSubtotal: 0,
    laborBurdenAmount: 0, adjustedDirectCost: 0,
    overheadAmount: 0, profitAmount: 0, subtotalBeforeBondIns: 0,
    bondAmount: 0, insuranceAmount: 0, contingencyAmount: 0, taxAmount: 0,
    totalBaseBid: 0, grandTotal: 0, sectionRollups: [],

    setHeader: (updates) => set((state) => { Object.assign(state.header, updates); }),

    addRow: (rowType, afterId) => set((state) => {
      const newRow = makeRow({ rowType });
      if (rowType === 'line_item') { newRow.unit = 'SF'; newRow.wastePercent = 5; }
      if (afterId) {
        const idx = state.rows.findIndex((r) => r.id === afterId);
        if (idx !== -1) {
          const afterRow = state.rows[idx];
          if (afterRow.rowType === 'division_header' || afterRow.rowType === 'subsection_header') {
            newRow.parentId = afterRow.id; newRow.csiCode = afterRow.csiCode;
          } else { newRow.parentId = afterRow.parentId; newRow.csiCode = afterRow.csiCode; }
          state.rows.splice(idx + 1, 0, newRow);
        } else { state.rows.push(newRow); }
      } else { state.rows.push(newRow); }
      recalcAll(state);
    }),

    updateRow: (id, updates) => set((state) => {
      const idx = state.rows.findIndex((r) => r.id === id);
      if (idx !== -1) { Object.assign(state.rows[idx], updates); recalcAll(state); }
    }),

    removeRow: (id) => set((state) => {
      state.rows = state.rows.filter((r) => r.id !== id && r.parentId !== id);
      recalcAll(state);
    }),

    moveRow: (id, direction) => set((state) => {
      const idx = state.rows.findIndex((r) => r.id === id);
      if (idx === -1) return;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= state.rows.length) return;
      [state.rows[idx], state.rows[swap]] = [state.rows[swap], state.rows[idx]];
      recalcAll(state);
    }),

    toggleExpand: (id) => set((state) => { const row = state.rows.find((r) => r.id === id); if (row) row.isExpanded = !row.isExpanded; }),

    setOverhead: (pct) => set((state) => { state.overheadPercent = pct; recalcAll(state); }),
    setProfit: (pct) => set((state) => { state.profitPercent = pct; recalcAll(state); }),
    setBond: (pct) => set((state) => { state.bondPercent = pct; recalcAll(state); }),
    setInsurance: (pct) => set((state) => { state.insurancePercent = pct; recalcAll(state); }),
    setLaborBurden: (pct) => set((state) => { state.laborBurdenPercent = pct; recalcAll(state); }),
    setContingency: (pct) => set((state) => { state.contingencyPercent = pct; recalcAll(state); }),
    setTax: (pct) => set((state) => { state.taxPercent = pct; recalcAll(state); }),

    addGenRequirement: () => set((state) => {
      state.generalRequirementsRows = [...state.generalRequirementsRows,
        { id: generateId(), description: '', qty: 0, unit: 'LS', materialUnitCost: 0, laborUnitCost: 0, totalCost: 0 }];
    }),
    updateGenRequirement: (id, updates) => set((state) => {
      state.generalRequirementsRows = state.generalRequirementsRows.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        updated.totalCost = round2(updated.qty * (updated.materialUnitCost + updated.laborUnitCost));
        return updated;
      });
      recalcAll(state);
    }),
    removeGenRequirement: (id) => set((state) => {
      state.generalRequirementsRows = state.generalRequirementsRows.filter((r) => r.id !== id);
      recalcAll(state);
    }),

    addGenCondition: () => set((state) => {
      state.generalConditionsRows = [...state.generalConditionsRows,
        { id: generateId(), description: '', duration: 0, durationUnit: 'months' as const, unitRate: 0, totalCost: 0 }];
    }),
    updateGenCondition: (id, updates) => set((state) => {
      state.generalConditionsRows = state.generalConditionsRows.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        updated.totalCost = round2(updated.duration * updated.unitRate);
        return updated;
      });
      recalcAll(state);
    }),
    removeGenCondition: (id) => set((state) => {
      state.generalConditionsRows = state.generalConditionsRows.filter((r) => r.id !== id);
      recalcAll(state);
    }),

    // ── Sub Bid Actions ──────────────────────────────────────────────────
    addSubBidScope: () => set((state) => {
      state.subBidScopes = [...state.subBidScopes,
        { id: generateId(), csiCode: '', scopeDescription: '', bids: [], selectedBidId: null, selectedAmount: 0 }];
    }),
    removeSubBidScope: (scopeId) => set((state) => {
      state.subBidScopes = state.subBidScopes.filter((s) => s.id !== scopeId);
    }),
    updateSubBidScope: (scopeId, updates) => set((state) => {
      const scope = state.subBidScopes.find((s) => s.id === scopeId);
      if (scope) Object.assign(scope, updates);
    }),
    addSubBid: (scopeId) => set((state) => {
      const scope = state.subBidScopes.find((s) => s.id === scopeId);
      if (!scope) return;
      scope.bids = [...scope.bids,
        { id: generateId(), subName: '', contactInfo: '', bidAmount: 0, bidDate: '', notes: '', isSelected: false }];
    }),
    updateSubBid: (scopeId, bidId, updates) => set((state) => {
      const scope = state.subBidScopes.find((s) => s.id === scopeId);
      if (!scope) return;
      scope.bids = scope.bids.map((b) => (b.id === bidId ? { ...b, ...updates } : b));
    }),
    removeSubBid: (scopeId, bidId) => set((state) => {
      const scope = state.subBidScopes.find((s) => s.id === scopeId);
      if (!scope) return;
      scope.bids = scope.bids.filter((b) => b.id !== bidId);
      if (scope.selectedBidId === bidId) { scope.selectedBidId = null; scope.selectedAmount = 0; }
    }),
    selectWinningBid: (scopeId, bidId) => set((state) => {
      const scope = state.subBidScopes.find((s) => s.id === scopeId);
      if (!scope) return;
      scope.bids = scope.bids.map((b) => ({ ...b, isSelected: b.id === bidId }));
      scope.selectedBidId = bidId;
      const winning = scope.bids.find((b) => b.id === bidId);
      scope.selectedAmount = winning ? winning.bidAmount : 0;
    }),

    // ── Option Actions ────────────────────────────────────────────────────
    addOption: () => set((state) => {
      state.options = [...state.options, makeOption({ name: `Option ${String.fromCharCode(65 + state.options.length)}` })];
    }),
    removeOption: (id) => set((state) => { state.options = state.options.filter((o) => o.id !== id); recalcAll(state); }),
    updateOptionMeta: (id, updates) => set((state) => {
      const option = state.options.find((o) => o.id === id);
      if (!option) return;
      Object.assign(option, updates);
      recalcAll(state);
    }),
    addOptionRow: (optionId, rowType, afterId) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      const newRow = makeRow({ rowType });
      if (rowType === 'line_item') { newRow.unit = 'SF'; newRow.wastePercent = 5; }
      if (afterId) {
        const idx = option.rows.findIndex((r) => r.id === afterId);
        if (idx !== -1) {
          const afterRow = option.rows[idx];
          if (afterRow.rowType === 'division_header' || afterRow.rowType === 'subsection_header') {
            newRow.parentId = afterRow.id; newRow.csiCode = afterRow.csiCode;
          } else { newRow.parentId = afterRow.parentId; newRow.csiCode = afterRow.csiCode; }
          option.rows.splice(idx + 1, 0, newRow);
        } else { option.rows.push(newRow); }
      } else { option.rows.push(newRow); }
      recalcAll(state);
    }),
    updateOptionRow: (optionId, rowId, updates) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      const idx = option.rows.findIndex((r) => r.id === rowId);
      if (idx !== -1) { Object.assign(option.rows[idx], updates); recalcAll(state); }
    }),
    removeOptionRow: (optionId, rowId) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      option.rows = option.rows.filter((r) => r.id !== rowId && r.parentId !== rowId);
      recalcAll(state);
    }),
    toggleOptionExpand: (optionId, rowId) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      const row = option.rows.find((r) => r.id === rowId);
      if (row) row.isExpanded = !row.isExpanded;
    }),
    moveOptionRow: (optionId, rowId, direction) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      const idx = option.rows.findIndex((r) => r.id === rowId);
      if (idx === -1) return;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= option.rows.length) return;
      [option.rows[idx], option.rows[swap]] = [option.rows[swap], option.rows[idx]];
      recalcAll(state);
    }),
    addOptionGR: (optionId) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      option.generalRequirementsRows = [...option.generalRequirementsRows,
        { id: generateId(), description: '', qty: 0, unit: 'LS', materialUnitCost: 0, laborUnitCost: 0, totalCost: 0 }];
    }),
    updateOptionGR: (optionId, rowId, updates) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      option.generalRequirementsRows = option.generalRequirementsRows.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, ...updates };
        updated.totalCost = round2(updated.qty * (updated.materialUnitCost + updated.laborUnitCost));
        return updated;
      });
      recalcAll(state);
    }),
    removeOptionGR: (optionId, rowId) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      option.generalRequirementsRows = option.generalRequirementsRows.filter((r) => r.id !== rowId);
      recalcAll(state);
    }),
    addOptionGC: (optionId) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      option.generalConditionsRows = [...option.generalConditionsRows,
        { id: generateId(), description: '', duration: 0, durationUnit: 'months' as const, unitRate: 0, totalCost: 0 }];
    }),
    updateOptionGC: (optionId, rowId, updates) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      option.generalConditionsRows = option.generalConditionsRows.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, ...updates };
        updated.totalCost = round2(updated.duration * updated.unitRate);
        return updated;
      });
      recalcAll(state);
    }),
    removeOptionGC: (optionId, rowId) => set((state) => {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) return;
      option.generalConditionsRows = option.generalConditionsRows.filter((r) => r.id !== rowId);
      recalcAll(state);
    }),

    recalculate: () => set((state) => { recalcAll(state); }),

    loadDemoEstimate: () => set((state) => {
      state.header = {
        projectName: 'Westside Apartment Renovation', revision: 'R2',
        address: '4500 Westside Blvd', city: 'Los Angeles', state: 'CA', zip: '90066',
        estimateDate: '2026-03-25', bidDate: '2026-04-15',
        architect: 'Gensler Associates', owner: 'Westside Development LLC',
        estimator: 'Bill Asmar', totalBaseBid: 0,
        scope: 'Complete interior renovation of 120-unit apartment complex including demolition, concrete, masonry, finishes, MEP systems, and site work per contract drawings dated 02/15/2026.',
        exclusions: 'Hazardous material abatement, furniture/fixtures/equipment (FF&E), landscaping, exterior facade work, tenant relocation costs.',
        clarifications: 'Pricing based on prevailing wage rates per Davis-Bacon determination CA20260001. All work during normal business hours. Owner to provide temporary power during construction.',
      };
      state.overheadPercent = 10; state.profitPercent = 10;
      state.bondPercent = 1.5; state.insurancePercent = 2.0;
      state.laborBurdenPercent = 35; state.contingencyPercent = 5; state.taxPercent = 0;

      state.generalRequirementsRows = [
        { id: generateId(), description: 'Project Management & Supervision', qty: 1, unit: 'LS', materialUnitCost: 0, laborUnitCost: 45000, totalCost: 45000 },
        { id: generateId(), description: 'Submittals & Shop Drawings', qty: 1, unit: 'LS', materialUnitCost: 2500, laborUnitCost: 8500, totalCost: 11000 },
        { id: generateId(), description: 'RFI Processing & Logs', qty: 1, unit: 'LS', materialUnitCost: 0, laborUnitCost: 4000, totalCost: 4000 },
        { id: generateId(), description: 'Temporary Facilities (Trailer, Fencing)', qty: 1, unit: 'LS', materialUnitCost: 12000, laborUnitCost: 3500, totalCost: 15500 },
        { id: generateId(), description: 'Testing & Inspection Allowance', qty: 1, unit: 'LS', materialUnitCost: 18000, laborUnitCost: 0, totalCost: 18000 },
        { id: generateId(), description: 'Final Cleanup & Punchlist', qty: 1, unit: 'LS', materialUnitCost: 4000, laborUnitCost: 12000, totalCost: 16000 },
      ];
      state.generalConditionsRows = [
        { id: generateId(), description: 'Superintendent', duration: 8, durationUnit: 'months', unitRate: 14500, totalCost: 116000 },
        { id: generateId(), description: 'Project Manager (Field)', duration: 8, durationUnit: 'months', unitRate: 16000, totalCost: 128000 },
        { id: generateId(), description: 'Field Office & IT', duration: 8, durationUnit: 'months', unitRate: 3200, totalCost: 25600 },
        { id: generateId(), description: 'Temporary Utilities', duration: 8, durationUnit: 'months', unitRate: 1800, totalCost: 14400 },
        { id: generateId(), description: 'Dumpsters & Waste Removal', duration: 8, durationUnit: 'months', unitRate: 2400, totalCost: 19200 },
        { id: generateId(), description: 'Permits & Fees', duration: 1, durationUnit: 'months', unitRate: 35000, totalCost: 35000 },
        { id: generateId(), description: 'Safety Equipment & Compliance', duration: 8, durationUnit: 'months', unitRate: 1500, totalCost: 12000 },
      ];

      state.subBidScopes = [
        {
          id: generateId(), csiCode: '23 00 00', scopeDescription: 'HVAC — Complete Mechanical System',
          selectedBidId: null, selectedAmount: 0,
          bids: [
            { id: 'sb1', subName: 'AAA Mechanical Inc.', contactInfo: '(310) 555-0101', bidAmount: 485000, bidDate: '2026-03-10', notes: 'Includes all ductwork, equipment, controls', isSelected: false },
            { id: 'sb2', subName: 'Pacific Air Systems', contactInfo: '(310) 555-0202', bidAmount: 512000, bidDate: '2026-03-12', notes: 'Alternate pricing for VRF system', isSelected: false },
            { id: 'sb3', subName: 'Valley Comfort HVAC', contactInfo: '(818) 555-0303', bidAmount: 498500, bidDate: '2026-03-11', notes: 'Per spec, standard split systems', isSelected: false },
          ],
        },
        {
          id: generateId(), csiCode: '26 00 00', scopeDescription: 'Electrical — Complete System',
          selectedBidId: null, selectedAmount: 0,
          bids: [
            { id: 'sb4', subName: 'Spark Electric Co.', contactInfo: '(310) 555-0404', bidAmount: 620000, bidDate: '2026-03-08', notes: 'Per proposal #SE-2026-0412', isSelected: false },
            { id: 'sb5', subName: 'PowerLine Electric', contactInfo: '(323) 555-0505', bidAmount: 645000, bidDate: '2026-03-09', notes: 'Includes fire alarm system', isSelected: false },
          ],
        },
      ];

      state.rows = DEMO_ROWS.map((r) => computeRow(r));
      state.options = [
        makeOption({
          id: 'opt-a', name: 'Option A', description: 'Premium Lobby Finish Upgrade', optionType: 'add',
          rows: [
            makeRow({ id: 'opt-a-d09', rowType: 'division_header', csiCode: '09 00 00', description: 'Division 09 — Finishes (Upgrade)' }),
            makeRow({ id: 'opt-a-1', rowType: 'line_item', parentId: 'opt-a-d09', csiCode: '09 65 00', description: 'Porcelain Tile (Lobby Upgrade)', qty: 2400, wastePercent: 10, unit: 'SF', materialUnitCost: 12.50, laborUnitCost: 8.00 }),
            makeRow({ id: 'opt-a-2', rowType: 'line_item', parentId: 'opt-a-d09', csiCode: '09 68 00', description: 'Custom Carpet (Premium Grade)', qty: 1800, wastePercent: 7, unit: 'SF', materialUnitCost: 8.75, laborUnitCost: 3.50 }),
            makeRow({ id: 'opt-a-st', rowType: 'subtotal', parentId: 'opt-a-d09', description: 'Subtotal — Option A Finishes' }),
          ],
          overheadPercent: 10, profitPercent: 10, bondPercent: 1.5, insurancePercent: 2.0,
          laborBurdenPercent: 35, contingencyPercent: 0, taxPercent: 0,
        }),
      ];
      recalcAll(state);
    }),
  }))
);

export const UNITS = ['SF', 'LF', 'EA', 'CY', 'SY', 'TON', 'LB', 'GAL', 'LS', 'HR', 'CF', 'MBF', 'SQRS', 'VLF', 'CSF'];

const DEMO_ROWS: EstimateRow[] = [
  makeRow({ id: 'd03', rowType: 'division_header', csiCode: '03 00 00', description: 'Division 03 — Concrete' }),
  makeRow({ id: 'd03-sub1', rowType: 'subsection_header', parentId: 'd03', csiCode: '03 30 00', description: 'Cast-in-Place Concrete' }),
  makeRow({ id: 'd03-n1', rowType: 'item_note', parentId: 'd03', description: 'Per structural drawings S-101 through S-108. Includes all formwork, rebar, and placement.' }),
  makeRow({ id: 'c1', rowType: 'line_item', parentId: 'd03', sheetNo: 'S-101', detailNo: '1A', csiCode: '03 31 00', description: 'Concrete Foundations — Spread Footings', qty: 450, wastePercent: 5, unit: 'CY', materialUnitCost: 185.00, laborUnitCost: 95.00, equipmentUnitCost: 35.00 }),
  makeRow({ id: 'c2', rowType: 'line_item', parentId: 'd03', sheetNo: 'S-102', detailNo: '2A', csiCode: '03 31 00', description: 'Concrete Slab on Grade (6")', qty: 8200, wastePercent: 3, unit: 'SF', materialUnitCost: 6.50, laborUnitCost: 4.25, equipmentUnitCost: 1.50 }),
  makeRow({ id: 'c3', rowType: 'line_item', parentId: 'd03', sheetNo: 'S-103', detailNo: '3B', csiCode: '03 21 00', description: 'Reinforcing Steel (#4 & #5 Rebar)', qty: 28, wastePercent: 3, unit: 'TON', materialUnitCost: 1450.00, laborUnitCost: 680.00, equipmentUnitCost: 120.00 }),
  makeRow({ id: 'd03-st', rowType: 'subtotal', parentId: 'd03', description: 'Subtotal — Division 03 Concrete' }),

  makeRow({ id: 'd04', rowType: 'division_header', csiCode: '04 00 00', description: 'Division 04 — Masonry' }),
  makeRow({ id: 'm1', rowType: 'line_item', parentId: 'd04', sheetNo: 'A-201', detailNo: '4A', csiCode: '04 22 00', description: 'CMU Block Walls (8x8x16 Lightweight)', qty: 12500, wastePercent: 5, unit: 'SF', materialUnitCost: 3.85, laborUnitCost: 8.50, equipmentUnitCost: 1.25 }),
  makeRow({ id: 'm2', rowType: 'line_item', parentId: 'd04', sheetNo: 'A-201', detailNo: '4B', csiCode: '04 22 00', description: 'CMU Grouting & Vertical Rebar', qty: 12500, wastePercent: 2, unit: 'SF', materialUnitCost: 1.10, laborUnitCost: 2.40 }),
  makeRow({ id: 'd04-st', rowType: 'subtotal', parentId: 'd04', description: 'Subtotal — Division 04 Masonry' }),

  makeRow({ id: 'd09', rowType: 'division_header', csiCode: '09 00 00', description: 'Division 09 — Finishes' }),
  makeRow({ id: 'd09-sub1', rowType: 'subsection_header', parentId: 'd09', csiCode: '09 20 00', description: 'Plaster & Gypsum Board' }),
  makeRow({ id: 'f1', rowType: 'line_item', parentId: 'd09', sheetNo: 'A-301', detailNo: '9A', csiCode: '09 29 00', description: 'Gypsum Board (5/8" Type X) — Walls', qty: 48000, wastePercent: 8, unit: 'SF', materialUnitCost: 1.85, laborUnitCost: 2.50 }),
  makeRow({ id: 'f2', rowType: 'line_item', parentId: 'd09', sheetNo: 'A-301', detailNo: '9B', csiCode: '09 29 00', description: 'Gypsum Board (5/8" Type X) — Ceilings', qty: 22000, wastePercent: 10, unit: 'SF', materialUnitCost: 2.10, laborUnitCost: 3.25 }),
  makeRow({ id: 'd09-sub2', rowType: 'subsection_header', parentId: 'd09', csiCode: '09 90 00', description: 'Painting & Coating' }),
  makeRow({ id: 'f3', rowType: 'line_item', parentId: 'd09', sheetNo: 'A-501', detailNo: '9C', csiCode: '09 91 00', description: 'Interior Painting (2 Coats Latex)', qty: 70000, wastePercent: 5, unit: 'SF', materialUnitCost: 0.45, laborUnitCost: 1.25 }),
  makeRow({ id: 'd09-sub3', rowType: 'subsection_header', parentId: 'd09', csiCode: '09 60 00', description: 'Flooring' }),
  makeRow({ id: 'f4', rowType: 'line_item', parentId: 'd09', sheetNo: 'A-501', detailNo: '9D', csiCode: '09 65 00', description: 'Resilient Flooring (LVT)', qty: 18000, wastePercent: 10, unit: 'SF', materialUnitCost: 4.25, laborUnitCost: 2.80 }),
  makeRow({ id: 'f5', rowType: 'line_item', parentId: 'd09', sheetNo: 'A-501', detailNo: '9E', csiCode: '09 68 00', description: 'Carpet Tile (Common Areas)', qty: 5200, wastePercent: 7, unit: 'SF', materialUnitCost: 3.50, laborUnitCost: 1.75 }),
  makeRow({ id: 'd09-st', rowType: 'subtotal', parentId: 'd09', description: 'Subtotal — Division 09 Finishes' }),

  makeRow({ id: 'd23', rowType: 'division_header', csiCode: '23 00 00', description: 'Division 23 — HVAC' }),
  makeRow({ id: 'd23-n1', rowType: 'item_note', parentId: 'd23', description: 'Subcontract: AAA Mechanical Inc. — Lump sum per sub bid dated 03/10/2026' }),
  makeRow({ id: 'h1', rowType: 'line_item', parentId: 'd23', sheetNo: 'M-101', detailNo: '23A', csiCode: '23 05 00', description: 'HVAC — Complete System (Sub Bid)', qty: 1, wastePercent: 0, unit: 'LS', materialUnitCost: 285000, laborUnitCost: 200000 }),
  makeRow({ id: 'd23-st', rowType: 'subtotal', parentId: 'd23', description: 'Subtotal — Division 23 HVAC' }),

  makeRow({ id: 'd26', rowType: 'division_header', csiCode: '26 00 00', description: 'Division 26 — Electrical' }),
  makeRow({ id: 'd26-n1', rowType: 'item_note', parentId: 'd26', description: 'Subcontract: Spark Electric Co. — Per proposal #SE-2026-0412' }),
  makeRow({ id: 'e1', rowType: 'line_item', parentId: 'd26', sheetNo: 'E-101', detailNo: '26A', csiCode: '26 05 00', description: 'Electrical — Complete (Sub Bid)', qty: 1, wastePercent: 0, unit: 'LS', materialUnitCost: 380000, laborUnitCost: 240000 }),
  makeRow({ id: 'd26-st', rowType: 'subtotal', parentId: 'd26', description: 'Subtotal — Division 26 Electrical' }),
];
