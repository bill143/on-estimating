// NEXUS ON Estimating — Audit Trail Logger
// All AI agent actions and estimate changes are immutably logged.

import { getSupabase } from '@/lib/supabase';

interface AuditEntry {
  organization_id?: string;
  user_id?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an immutable audit trail entry.
 * Used by all agents and the orchestrator to track every action.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('audit_trail').insert({
      organization_id: entry.organization_id || null,
      user_id: entry.user_id || null,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      old_value: entry.old_value || null,
      new_value: entry.new_value || null,
      metadata: entry.metadata || {},
    });
  } catch (error) {
    // Audit logging should never block the main flow
    console.error('[Audit] Failed to log entry:', error);
  }
}

/**
 * Log an AI agent action to the dedicated agent actions table.
 */
export async function logAgentAction(action: {
  organization_id?: string;
  conversation_id?: string;
  user_id?: string;
  agent_domain: string;
  skill_id: string;
  action: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  duration_ms?: number;
  error_message?: string;
}): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('ai_agent_actions')
      .insert({
        ...action,
        completed_at: action.status === 'completed' || action.status === 'failed'
          ? new Date().toISOString()
          : null,
      })
      .select('id')
      .single();

    return data?.id || null;
  } catch (error) {
    console.error('[AgentAudit] Failed to log action:', error);
    return null;
  }
}
