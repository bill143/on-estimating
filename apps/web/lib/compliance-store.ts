'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateId } from './utils';

export interface WageDetermination {
  id: string;
  classification: string;         // e.g., "Carpenter", "Electrician"
  baseRate: number;               // Base hourly rate
  fringeRate: number;             // Fringe benefit rate
  totalRate: number;              // Base + Fringe
  county: string;
  state: string;
  determinationNumber: string;    // e.g., "CA20240001"
  effectiveDate: string;
  expirationDate: string | null;
  isSuperseded: boolean;
}

export interface LaborEntry {
  id: string;
  projectId: string;
  workerId: string;
  workerName: string;
  classification: string;
  hoursWorked: number;
  rateApplied: number;
  prevailingRate: number;
  isCompliant: boolean;
  weekEnding: string;
  notes: string;
}

interface ComplianceState {
  determinations: WageDetermination[];
  laborEntries: LaborEntry[];
  isLoading: boolean;
  selectedCounty: string;
  selectedState: string;

  setDeterminations: (dets: WageDetermination[]) => void;
  addLaborEntry: (entry: LaborEntry) => void;
  updateLaborEntry: (id: string, updates: Partial<LaborEntry>) => void;
  removeLaborEntry: (id: string) => void;
  setFilter: (county: string, state: string) => void;
  loadDemoData: () => void;
}

export const useComplianceStore = create<ComplianceState>()(
  immer((set) => ({
    determinations: [],
    laborEntries: [],
    isLoading: false,
    selectedCounty: 'Los Angeles',
    selectedState: 'CA',

    setDeterminations: (dets) =>
      set((state) => { state.determinations = dets; }),

    addLaborEntry: (entry) =>
      set((state) => { state.laborEntries.push(entry); }),

    updateLaborEntry: (id, updates) =>
      set((state) => {
        const idx = state.laborEntries.findIndex((e) => e.id === id);
        if (idx !== -1) Object.assign(state.laborEntries[idx], updates);
      }),

    removeLaborEntry: (id) =>
      set((state) => {
        state.laborEntries = state.laborEntries.filter((e) => e.id !== id);
      }),

    setFilter: (county, selectedState) =>
      set((state) => {
        state.selectedCounty = county;
        state.selectedState = selectedState;
      }),

    loadDemoData: () =>
      set((state) => {
        state.determinations = DEMO_WAGE_DETERMINATIONS;
        state.laborEntries = DEMO_LABOR_ENTRIES;
      }),
  }))
);

const DEMO_WAGE_DETERMINATIONS: WageDetermination[] = [
  { id: '1', classification: 'Carpenter', baseRate: 52.41, fringeRate: 23.87, totalRate: 76.28, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
  { id: '2', classification: 'Electrician', baseRate: 58.92, fringeRate: 27.43, totalRate: 86.35, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
  { id: '3', classification: 'Plumber / Pipefitter', baseRate: 56.78, fringeRate: 28.15, totalRate: 84.93, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
  { id: '4', classification: 'Iron Worker (Structural)', baseRate: 54.30, fringeRate: 32.45, totalRate: 86.75, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
  { id: '5', classification: 'Laborer (General)', baseRate: 38.25, fringeRate: 19.80, totalRate: 58.05, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
  { id: '6', classification: 'Operating Engineer (Crane)', baseRate: 55.10, fringeRate: 30.20, totalRate: 85.30, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
  { id: '7', classification: 'Painter', baseRate: 45.62, fringeRate: 21.38, totalRate: 67.00, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
  { id: '8', classification: 'Sheet Metal Worker', baseRate: 53.85, fringeRate: 29.65, totalRate: 83.50, county: 'Los Angeles', state: 'CA', determinationNumber: 'CA20260001', effectiveDate: '2026-01-01', expirationDate: null, isSuperseded: false },
];

const DEMO_LABOR_ENTRIES: LaborEntry[] = [
  { id: 'l1', projectId: '8', workerId: 'W001', workerName: 'John Martinez', classification: 'Carpenter', hoursWorked: 40, rateApplied: 76.28, prevailingRate: 76.28, isCompliant: true, weekEnding: '2026-03-22', notes: '' },
  { id: 'l2', projectId: '8', workerId: 'W002', workerName: 'Mike Chen', classification: 'Electrician', hoursWorked: 38, rateApplied: 86.35, prevailingRate: 86.35, isCompliant: true, weekEnding: '2026-03-22', notes: '' },
  { id: 'l3', projectId: '8', workerId: 'W003', workerName: 'Carlos Rivera', classification: 'Laborer (General)', hoursWorked: 40, rateApplied: 55.00, prevailingRate: 58.05, isCompliant: false, weekEnding: '2026-03-22', notes: 'UNDERPAYMENT: $3.05/hr below prevailing wage' },
];
