'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BidStage } from '@on/db';

export interface PipelineProject {
  id: string;
  name: string;
  client: string;
  value: number;
  stage: BidStage;
  bidDueDate: string | null;
  tradeScope: string | null;
  confidence: number | null;
  assignedTo: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PipelineState {
  projects: PipelineProject[];
  isLoading: boolean;
  selectedProjectId: string | null;

  // Actions
  setProjects: (projects: PipelineProject[]) => void;
  addProject: (project: PipelineProject) => void;
  updateProject: (id: string, updates: Partial<PipelineProject>) => void;
  moveProject: (id: string, newStage: BidStage) => void;
  removeProject: (id: string) => void;
  setSelectedProject: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  reorderInStage: (stage: BidStage, activeId: string, overId: string) => void;
}

export const usePipelineStore = create<PipelineState>()(
  immer((set) => ({
    projects: [],
    isLoading: false,
    selectedProjectId: null,

    setProjects: (projects) =>
      set((state) => {
        state.projects = projects;
      }),

    addProject: (project) =>
      set((state) => {
        state.projects.push(project);
      }),

    updateProject: (id, updates) =>
      set((state) => {
        const idx = state.projects.findIndex((p) => p.id === id);
        if (idx !== -1) {
          Object.assign(state.projects[idx], updates);
        }
      }),

    moveProject: (id, newStage) =>
      set((state) => {
        const idx = state.projects.findIndex((p) => p.id === id);
        if (idx !== -1) {
          state.projects[idx].stage = newStage;
          state.projects[idx].updatedAt = new Date().toISOString();
        }
      }),

    removeProject: (id) =>
      set((state) => {
        state.projects = state.projects.filter((p) => p.id !== id);
      }),

    setSelectedProject: (id) =>
      set((state) => {
        state.selectedProjectId = id;
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    reorderInStage: (stage, activeId, overId) =>
      set((state) => {
        const stageProjects = state.projects
          .filter((p) => p.stage === stage)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const activeIdx = stageProjects.findIndex((p) => p.id === activeId);
        const overIdx = stageProjects.findIndex((p) => p.id === overId);

        if (activeIdx === -1 || overIdx === -1) return;

        // Swap sort orders
        const temp = stageProjects[activeIdx].sortOrder;
        const activeGlobal = state.projects.findIndex((p) => p.id === activeId);
        const overGlobal = state.projects.findIndex((p) => p.id === overId);
        state.projects[activeGlobal].sortOrder = stageProjects[overIdx].sortOrder;
        state.projects[overGlobal].sortOrder = temp;
      }),
  }))
);

// Demo data for initial load
export const DEMO_PROJECTS: PipelineProject[] = [
  {
    id: '1',
    name: 'Downtown Office Complex',
    client: 'Acme Development Corp',
    value: 12500000,
    stage: 'lead',
    bidDueDate: '2026-04-15',
    tradeScope: 'General Construction',
    confidence: 35,
    assignedTo: 'Bill Asmar',
    notes: 'Initial meeting scheduled. Owner rep is Mike Johnson.',
    sortOrder: 0,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
  },
  {
    id: '2',
    name: 'Westside Apartment Renovation',
    client: 'BuildIt Properties',
    value: 4500000,
    stage: 'estimating',
    bidDueDate: '2026-04-08',
    tradeScope: 'Interior Renovation',
    confidence: 55,
    assignedTo: 'Bill Asmar',
    notes: 'Plans received. 3 buildings, 120 units total.',
    sortOrder: 0,
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-03-22T00:00:00Z',
  },
  {
    id: '3',
    name: 'City Park Pavilion',
    client: 'City of Riverside',
    value: 800000,
    stage: 'review',
    bidDueDate: '2026-04-02',
    tradeScope: 'Site Work + Structures',
    confidence: 70,
    assignedTo: 'Bill Asmar',
    notes: 'Estimate complete, pending internal review.',
    sortOrder: 0,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-03-24T00:00:00Z',
  },
  {
    id: '4',
    name: 'Tech Hub HQ Build-Out',
    client: 'TechStart Inc',
    value: 2100000,
    stage: 'submitted',
    bidDueDate: '2026-03-28',
    tradeScope: 'Commercial Interior',
    confidence: 60,
    assignedTo: 'Bill Asmar',
    notes: 'Bid submitted 3/20. Awaiting response.',
    sortOrder: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
  },
  {
    id: '5',
    name: 'Harbor View Mall Expansion',
    client: 'Retail Giants LLC',
    value: 8200000,
    stage: 'estimating',
    bidDueDate: '2026-04-20',
    tradeScope: 'General + MEP',
    confidence: 45,
    assignedTo: 'Bill Asmar',
    notes: 'Large scope. May need sub bids for MEP.',
    sortOrder: 1,
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-23T00:00:00Z',
  },
  {
    id: '6',
    name: 'Riverside Medical Office',
    client: 'HealthCorp',
    value: 3400000,
    stage: 'won',
    bidDueDate: '2026-03-01',
    tradeScope: 'Medical Fit-Out',
    confidence: 100,
    assignedTo: 'Bill Asmar',
    notes: 'Contract signed 3/15. NTP pending.',
    sortOrder: 0,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: '7',
    name: 'Old Library Restoration',
    client: 'Heritage Foundation',
    value: 500000,
    stage: 'lost',
    bidDueDate: '2026-02-15',
    tradeScope: 'Historic Restoration',
    confidence: 0,
    assignedTo: 'Bill Asmar',
    notes: 'Lost to competitor. Price was 12% higher.',
    sortOrder: 0,
    createdAt: '2025-11-15T00:00:00Z',
    updatedAt: '2026-02-20T00:00:00Z',
  },
  {
    id: '8',
    name: 'Federal Courthouse Annex',
    client: 'US GSA',
    value: 15000000,
    stage: 'lead',
    bidDueDate: '2026-05-01',
    tradeScope: 'Federal Construction',
    confidence: 25,
    assignedTo: 'Bill Asmar',
    notes: 'SAM.gov opportunity. Davis-Bacon applies.',
    sortOrder: 1,
    createdAt: '2026-03-18T00:00:00Z',
    updatedAt: '2026-03-24T00:00:00Z',
  },
];
