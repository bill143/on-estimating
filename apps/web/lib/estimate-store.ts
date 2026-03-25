'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateId } from './utils';

// ─── Row Types ───────────────────────────────────────────────────────────
export type RowType =
  | 'division_header'   // CSI Division-level header (bold, shaded, spans full width)
  | 'subsection_header' // Sub-section within a division (semi-bold, slight indent)
  | 'item_note'         // Non-cost informational row (italic, no calculations)
  | 'line_item'         // Full cost row — all 14 columns editable
  | 'subtotal';         // Auto-summed subtotal row for the parent section

// ─── 14-Column Line Item ─────────────────────────────────────────────────
export interface EstimateRow {
  id: string;
  rowType: RowType;
  parentId: string | null;       // Links sub-items to their division/subsection
  sortOrder: number;

  // Column 1: SR# — auto-assigned serial number (display only)
  srNo: number;

  // Column 2: Sheet No.
  sheetNo: string;

  // Column 3: Detail No.
  detailNo: string;

  // Column 4: CSI No.
  csiCode: string;

  // Column 5: Description
  description: string;

  // Column 6: QTY (editable for line_item)
  qty: number;

  // Column 7: WASTE % (editable for line_item)
  wastePercent: number;

  // Column 8: QTY W/WASTE — computed: QTY * (1 + WASTE/100)
  qtyWithWaste: number;

  // Column 9: UNIT
  unit: string;

  // Column 10: Material Unit Cost
  materialUnitCost: number;

  // Column 11: Labor Unit Cost
  laborUnitCost: number;

  // Column 12: Total Unit Cost — computed: materialUnitCost + laborUnitCost
  totalUnitCost: number;

  // Column 13: Total Cost — computed: qtyWithWaste * totalUnitCost
  totalCost: number;

  // Column 14: Sub Totals — populated on subtotal rows, section sum for headers
  subTotal: number;

  // UI state
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
  totalBaseBid: number; // computed
}

// ─── Alternate ───────────────────────────────────────────────────────────
export interface Alternate {
  id: string;
  name: string;
  description: string;
  amount: number;
}

// ─── Summary Section Rollup ──────────────────────────────────────────────
export interface SectionRollup {
  divisionId: string;
  csiCode: string;
  description: string;
  materialTotal: number;
  laborTotal: number;
  totalCost: number;
}

// ─── Store State ─────────────────────────────────────────────────────────
export interface EstimateState {
  header: EstimateHeader;
  rows: EstimateRow[];
  alternates: Alternate[];

  // O&P
  overheadPercent: number;
  profitPercent: number;

  // Computed totals
  directCostSubtotal: number;
  overheadAmount: number;
  profitAmount: number;
  totalBaseBid: number;
  sectionRollups: SectionRollup[];

  // Actions
  setHeader: (updates: Partial<EstimateHeader>) => void;
  addRow: (rowType: RowType, afterId?: string) => void;
  updateRow: (id: string, updates: Partial<EstimateRow>) => void;
  removeRow: (id: string) => void;
  moveRow: (id: string, direction: 'up' | 'down') => void;
  toggleExpand: (id: string) => void;
  setOverhead: (pct: number) => void;
  setProfit: (pct: number) => void;
  addAlternate: () => void;
  updateAlternate: (id: string, updates: Partial<Alternate>) => void;
  removeAlternate: (id: string) => void;
  recalculate: () => void;
  loadDemoEstimate: () => void;
}

// ─── Computation Helpers ─────────────────────────────────────────────────
function computeRow(row: EstimateRow): EstimateRow {
  if (row.rowType !== 'line_item') return row;
  const qtyWithWaste = round2(row.qty * (1 + row.wastePercent / 100));
  const totalUnitCost = round2(row.materialUnitCost + row.laborUnitCost);
  const totalCost = round2(qtyWithWaste * totalUnitCost);
  return { ...row, qtyWithWaste, totalUnitCost, totalCost };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function recalcAll(state: EstimateState) {
  // Recompute every line item
  for (let i = 0; i < state.rows.length; i++) {
    if (state.rows[i].rowType === 'line_item') {
      state.rows[i] = computeRow(state.rows[i]);
    }
  }

  // Reassign SR numbers
  let sr = 1;
  for (const row of state.rows) {
    row.srNo = sr++;
  }

  // Build section rollups — group line_items by their parent division_header
  const divisionMap = new Map<string, { csiCode: string; description: string; matTotal: number; labTotal: number; costTotal: number }>();
  let currentDivisionId: string | null = null;

  for (const row of state.rows) {
    if (row.rowType === 'division_header') {
      currentDivisionId = row.id;
      if (!divisionMap.has(row.id)) {
        divisionMap.set(row.id, { csiCode: row.csiCode, description: row.description, matTotal: 0, labTotal: 0, costTotal: 0 });
      }
    } else if (row.rowType === 'line_item' && currentDivisionId) {
      const div = divisionMap.get(currentDivisionId);
      if (div) {
        div.matTotal = round2(div.matTotal + row.qtyWithWaste * row.materialUnitCost);
        div.labTotal = round2(div.labTotal + row.qtyWithWaste * row.laborUnitCost);
        div.costTotal = round2(div.costTotal + row.totalCost);
      }
    }
  }

  // Update subtotal rows — each subtotal sums line_items between the previous header and itself
  for (let i = 0; i < state.rows.length; i++) {
    if (state.rows[i].rowType === 'subtotal') {
      let sum = 0;
      // Walk backward to find line items belonging to this section
      for (let j = i - 1; j >= 0; j--) {
        if (state.rows[j].rowType === 'division_header' || state.rows[j].rowType === 'subtotal') break;
        if (state.rows[j].rowType === 'line_item') {
          sum = round2(sum + state.rows[j].totalCost);
        }
      }
      state.rows[i].subTotal = sum;
    }
    // Also set subTotal on division headers
    if (state.rows[i].rowType === 'division_header') {
      const div = divisionMap.get(state.rows[i].id);
      state.rows[i].subTotal = div ? div.costTotal : 0;
    }
  }

  // Section rollups for summary
  state.sectionRollups = [];
  for (const [divId, data] of divisionMap) {
    state.sectionRollups.push({
      divisionId: divId,
      csiCode: data.csiCode,
      description: data.description,
      materialTotal: data.matTotal,
      laborTotal: data.labTotal,
      totalCost: data.costTotal,
    });
  }

  // Totals
  state.directCostSubtotal = round2(
    state.rows.filter((r) => r.rowType === 'line_item').reduce((sum, r) => sum + r.totalCost, 0)
  );
  state.overheadAmount = round2(state.directCostSubtotal * (state.overheadPercent / 100));
  state.profitAmount = round2(state.directCostSubtotal * (state.profitPercent / 100));
  state.totalBaseBid = round2(state.directCostSubtotal + state.overheadAmount + state.profitAmount);
  state.header.totalBaseBid = state.totalBaseBid;
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
    totalUnitCost: 0,
    totalCost: 0,
    subTotal: 0,
    isExpanded: true,
    ...rest,
  };
}

// ─── Zustand Store ───────────────────────────────────────────────────────
export const useEstimateStore = create<EstimateState>()(
  immer((set) => ({
    header: {
      projectName: '',
      revision: 'R0',
      address: '',
      city: '',
      state: '',
      zip: '',
      estimateDate: new Date().toISOString().split('T')[0],
      bidDate: '',
      architect: '',
      owner: '',
      estimator: 'Bill Asmar',
      totalBaseBid: 0,
    },
    rows: [],
    alternates: [],
    overheadPercent: 10,
    profitPercent: 10,
    directCostSubtotal: 0,
    overheadAmount: 0,
    profitAmount: 0,
    totalBaseBid: 0,
    sectionRollups: [],

    setHeader: (updates) =>
      set((state) => {
        Object.assign(state.header, updates);
      }),

    addRow: (rowType, afterId) =>
      set((state) => {
        const newRow = makeRow({ rowType });
        if (rowType === 'line_item') {
          newRow.unit = 'SF';
          newRow.wastePercent = 5;
        }
        if (afterId) {
          const idx = state.rows.findIndex((r) => r.id === afterId);
          if (idx !== -1) {
            // Inherit parentId from the row we're inserting after
            const afterRow = state.rows[idx];
            if (afterRow.rowType === 'division_header' || afterRow.rowType === 'subsection_header') {
              newRow.parentId = afterRow.id;
              newRow.csiCode = afterRow.csiCode;
            } else {
              newRow.parentId = afterRow.parentId;
              newRow.csiCode = afterRow.csiCode;
            }
            state.rows.splice(idx + 1, 0, newRow);
          } else {
            state.rows.push(newRow);
          }
        } else {
          state.rows.push(newRow);
        }
        recalcAll(state);
      }),

    updateRow: (id, updates) =>
      set((state) => {
        const idx = state.rows.findIndex((r) => r.id === id);
        if (idx !== -1) {
          Object.assign(state.rows[idx], updates);
          if (state.rows[idx].rowType === 'line_item') {
            state.rows[idx] = computeRow(state.rows[idx]);
          }
          recalcAll(state);
        }
      }),

    removeRow: (id) =>
      set((state) => {
        state.rows = state.rows.filter((r) => r.id !== id && r.parentId !== id);
        recalcAll(state);
      }),

    moveRow: (id, direction) =>
      set((state) => {
        const idx = state.rows.findIndex((r) => r.id === id);
        if (idx === -1) return;
        const swap = direction === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= state.rows.length) return;
        [state.rows[idx], state.rows[swap]] = [state.rows[swap], state.rows[idx]];
        recalcAll(state);
      }),

    toggleExpand: (id) =>
      set((state) => {
        const row = state.rows.find((r) => r.id === id);
        if (row) row.isExpanded = !row.isExpanded;
      }),

    setOverhead: (pct) =>
      set((state) => {
        state.overheadPercent = pct;
        recalcAll(state);
      }),

    setProfit: (pct) =>
      set((state) => {
        state.profitPercent = pct;
        recalcAll(state);
      }),

    addAlternate: () =>
      set((state) => {
        state.alternates.push({ id: generateId(), name: '', description: '', amount: 0 });
      }),

    updateAlternate: (id, updates) =>
      set((state) => {
        const alt = state.alternates.find((a) => a.id === id);
        if (alt) Object.assign(alt, updates);
      }),

    removeAlternate: (id) =>
      set((state) => {
        state.alternates = state.alternates.filter((a) => a.id !== id);
      }),

    recalculate: () =>
      set((state) => {
        recalcAll(state);
      }),

    loadDemoEstimate: () =>
      set((state) => {
        state.header = {
          projectName: 'Westside Apartment Renovation',
          revision: 'R2',
          address: '4500 Westside Blvd',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90066',
          estimateDate: '2026-03-25',
          bidDate: '2026-04-15',
          architect: 'Gensler Associates',
          owner: 'Westside Development LLC',
          estimator: 'Bill Asmar',
          totalBaseBid: 0,
        };
        state.overheadPercent = 10;
        state.profitPercent = 10;
        state.alternates = [
          { id: generateId(), name: 'ALT-1', description: 'Upgrade to porcelain tile in lobby', amount: 18500 },
          { id: generateId(), name: 'ALT-2', description: 'Add generator backup system', amount: 42000 },
        ];
        state.rows = DEMO_ROWS.map((r) => computeRow(r));
        recalcAll(state);
      }),
  }))
);

// ─── Unit options ────────────────────────────────────────────────────────
export const UNITS = ['SF', 'LF', 'EA', 'CY', 'SY', 'TON', 'LB', 'GAL', 'LS', 'HR', 'CF', 'MBF', 'SQRS', 'VLF', 'CSF'];

// ─── Demo Data ───────────────────────────────────────────────────────────
const DEMO_ROWS: EstimateRow[] = [
  // ── Division 03 — Concrete ──
  makeRow({ id: 'd03', rowType: 'division_header', csiCode: '03 00 00', description: 'Division 03 — Concrete' }),
  makeRow({ id: 'd03-sub1', rowType: 'subsection_header', parentId: 'd03', csiCode: '03 30 00', description: 'Cast-in-Place Concrete' }),
  makeRow({ id: 'd03-n1', rowType: 'item_note', parentId: 'd03', description: 'Per structural drawings S-101 through S-108. Includes all formwork, rebar, and placement.' }),
  makeRow({ id: 'c1', rowType: 'line_item', parentId: 'd03', sheetNo: 'S-101', detailNo: '1A', csiCode: '03 31 00', description: 'Concrete Foundations — Spread Footings', qty: 450, wastePercent: 5, unit: 'CY', materialUnitCost: 185.00, laborUnitCost: 95.00 }),
  makeRow({ id: 'c2', rowType: 'line_item', parentId: 'd03', sheetNo: 'S-102', detailNo: '2A', csiCode: '03 31 00', description: 'Concrete Slab on Grade (6")', qty: 8200, wastePercent: 3, unit: 'SF', materialUnitCost: 6.50, laborUnitCost: 4.25 }),
  makeRow({ id: 'c3', rowType: 'line_item', parentId: 'd03', sheetNo: 'S-103', detailNo: '3B', csiCode: '03 21 00', description: 'Reinforcing Steel (#4 & #5 Rebar)', qty: 28, wastePercent: 3, unit: 'TON', materialUnitCost: 1450.00, laborUnitCost: 680.00 }),
  makeRow({ id: 'd03-st', rowType: 'subtotal', parentId: 'd03', description: 'Subtotal — Division 03 Concrete' }),

  // ── Division 04 — Masonry ──
  makeRow({ id: 'd04', rowType: 'division_header', csiCode: '04 00 00', description: 'Division 04 — Masonry' }),
  makeRow({ id: 'm1', rowType: 'line_item', parentId: 'd04', sheetNo: 'A-201', detailNo: '4A', csiCode: '04 22 00', description: 'CMU Block Walls (8x8x16 Lightweight)', qty: 12500, wastePercent: 5, unit: 'SF', materialUnitCost: 3.85, laborUnitCost: 8.50 }),
  makeRow({ id: 'm2', rowType: 'line_item', parentId: 'd04', sheetNo: 'A-201', detailNo: '4B', csiCode: '04 22 00', description: 'CMU Grouting & Vertical Rebar', qty: 12500, wastePercent: 2, unit: 'SF', materialUnitCost: 1.10, laborUnitCost: 2.40 }),
  makeRow({ id: 'd04-st', rowType: 'subtotal', parentId: 'd04', description: 'Subtotal — Division 04 Masonry' }),

  // ── Division 09 — Finishes ──
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

  // ── Division 23 — HVAC (Subcontracted) ──
  makeRow({ id: 'd23', rowType: 'division_header', csiCode: '23 00 00', description: 'Division 23 — HVAC' }),
  makeRow({ id: 'd23-n1', rowType: 'item_note', parentId: 'd23', description: 'Subcontract: AAA Mechanical Inc. — Lump sum per sub bid dated 03/10/2026' }),
  makeRow({ id: 'h1', rowType: 'line_item', parentId: 'd23', sheetNo: 'M-101', detailNo: '23A', csiCode: '23 05 00', description: 'HVAC — Complete System (Sub Bid)', qty: 1, wastePercent: 0, unit: 'LS', materialUnitCost: 285000, laborUnitCost: 200000 }),
  makeRow({ id: 'd23-st', rowType: 'subtotal', parentId: 'd23', description: 'Subtotal — Division 23 HVAC' }),

  // ── Division 26 — Electrical (Subcontracted) ──
  makeRow({ id: 'd26', rowType: 'division_header', csiCode: '26 00 00', description: 'Division 26 — Electrical' }),
  makeRow({ id: 'd26-n1', rowType: 'item_note', parentId: 'd26', description: 'Subcontract: Spark Electric Co. — Per proposal #SE-2026-0412' }),
  makeRow({ id: 'e1', rowType: 'line_item', parentId: 'd26', sheetNo: 'E-101', detailNo: '26A', csiCode: '26 05 00', description: 'Electrical — Complete (Sub Bid)', qty: 1, wastePercent: 0, unit: 'LS', materialUnitCost: 380000, laborUnitCost: 240000 }),
  makeRow({ id: 'd26-st', rowType: 'subtotal', parentId: 'd26', description: 'Subtotal — Division 26 Electrical' }),
];
