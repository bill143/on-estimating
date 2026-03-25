'use client';

import type { BidStage } from '@on/db';
import { getSupabase } from './supabase';
import type { PipelineProject } from './store';

// ─── Helpers ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProject(row: any): PipelineProject {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    value: Number(row.value),
    stage: row.stage as BidStage,
    bidDueDate: row.bid_due_date ?? null,
    tradeScope: row.trade_scope ?? null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    assignedTo: row.assigned_to ?? null,
    notes: row.notes ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Pipeline CRUD ───────────────────────────────────────────────────────
export async function fetchProjects(): Promise<PipelineProject[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('fetchProjects error:', error.message);
    return [];
  }
  return (data ?? []).map(toProject);
}

export async function createProject(project: Omit<PipelineProject, 'id' | 'createdAt' | 'updatedAt'>) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('projects') as any)
    .insert({
      name: project.name,
      client: project.client,
      value: project.value,
      stage: project.stage,
      bid_due_date: project.bidDueDate,
      trade_scope: project.tradeScope,
      confidence: project.confidence,
      assigned_to: project.assignedTo,
      notes: project.notes,
      sort_order: project.sortOrder,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) throw new Error((error as { message: string }).message);
  return toProject(data);
}

export async function updateProjectDB(id: string, updates: Partial<PipelineProject>) {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.client !== undefined) payload.client = updates.client;
  if (updates.value !== undefined) payload.value = updates.value;
  if (updates.stage !== undefined) payload.stage = updates.stage;
  if (updates.bidDueDate !== undefined) payload.bid_due_date = updates.bidDueDate;
  if (updates.tradeScope !== undefined) payload.trade_scope = updates.tradeScope;
  if (updates.confidence !== undefined) payload.confidence = updates.confidence;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('projects') as any)
    .update(payload)
    .eq('id', id);

  if (error) throw new Error((error as { message: string }).message);
}

export async function deleteProjectDB(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Realtime subscription ───────────────────────────────────────────────
export function subscribeToProjects(onUpdate: (projects: PipelineProject[]) => void) {
  const supabase = getSupabase();
  const channel = supabase
    .channel('projects-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      async () => {
        const projects = await fetchProjects();
        onUpdate(projects);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
