// @on/db � Shared types, enums, and RBAC for the on-estimating monorepo
 
// Supabase Database type — placeholder until generated via `supabase gen types typescript`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

export type BidStage = 'lead' | 'estimating' | 'review' | 'submitted' | 'won' | 'lost';
 
export const STAGE_CONFIG: Record<BidStage, { label: string; color: string; bgColor: string }> = {
  lead:       { label: 'Lead',       color: 'text-blue-700',    bgColor: 'bg-blue-50 border-blue-200'      },
  estimating: { label: 'Estimating', color: 'text-amber-700',   bgColor: 'bg-amber-50 border-amber-200'    },
  review:     { label: 'Review',     color: 'text-purple-700',  bgColor: 'bg-purple-50 border-purple-200'  },
  submitted:  { label: 'Submitted',  color: 'text-cyan-700',    bgColor: 'bg-cyan-50 border-cyan-200'      },
  won:        { label: 'Won',        color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  lost:       { label: 'Lost',       color: 'text-gray-500',    bgColor: 'bg-gray-50 border-gray-200'      },
};
 
export type UserRole = 'owner' | 'admin' | 'senior_estimator' | 'estimator' | 'viewer' | 'subcontractor';
 
export type Permission =
  | 'estimate:create' | 'estimate:read' | 'estimate:update' | 'estimate:delete' | 'estimate:export'
  | 'project:create'  | 'project:read'  | 'project:update'  | 'project:delete'
  | 'takeoff:create'  | 'takeoff:read'  | 'takeoff:update'  | 'takeoff:approve'
  | 'bid:create'      | 'bid:read'      | 'bid:update'
  | 'user:invite'     | 'user:manage'
  | 'ai:use'
  | 'settings:read'   | 'settings:update'
  | 'compliance:read' | 'compliance:update';
 
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner:            ['estimate:create','estimate:read','estimate:update','estimate:delete','estimate:export','project:create','project:read','project:update','project:delete','takeoff:create','takeoff:read','takeoff:update','takeoff:approve','bid:create','bid:read','bid:update','user:invite','user:manage','ai:use','settings:read','settings:update','compliance:read','compliance:update'],
  admin:            ['estimate:create','estimate:read','estimate:update','estimate:delete','estimate:export','project:create','project:read','project:update','project:delete','takeoff:create','takeoff:read','takeoff:update','takeoff:approve','bid:create','bid:read','bid:update','user:invite','user:manage','ai:use','settings:read','settings:update','compliance:read','compliance:update'],
  senior_estimator: ['estimate:create','estimate:read','estimate:update','estimate:export','project:create','project:read','project:update','takeoff:create','takeoff:read','takeoff:update','takeoff:approve','bid:create','bid:read','bid:update','ai:use','settings:read','compliance:read'],
  estimator:        ['estimate:create','estimate:read','estimate:update','estimate:export','project:read','project:update','takeoff:create','takeoff:read','takeoff:update','bid:read','bid:update','ai:use','settings:read','compliance:read'],
  viewer:           ['estimate:read','project:read','takeoff:read','bid:read','compliance:read'],
  subcontractor:    ['bid:read','estimate:read'],
};
 
export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner', admin: 'Admin', senior_estimator: 'Senior Estimator',
  estimator: 'Estimator', viewer: 'Viewer', subcontractor: 'Subcontractor',
};
 
export type AgentDomain = 'takeoff' | 'pricing' | 'bid' | 'analytics' | 'compliance' | 'collaboration';
 
export interface AgentSkill {
  id: string; name: string; description: string;
  parameters: Array<{ name: string; type: string; description: string; required: boolean }>;
  isImplemented: boolean;
}
 
export interface AgentDefinition {
  id: string; name: string; domain: AgentDomain; description: string;
  skills: AgentSkill[]; canChainTo: string[]; contextRequired: string[];
  systemPrompt: string; isActive: boolean;
}
 
export interface AgentContext {
  userId: string; organizationId: string;
  activeEstimateId?: string; activeProjectId?: string; activePlanId?: string;
  permissions: Permission[]; metadata: Record<string, unknown>;
}
 
export interface AgentResult {
  success: boolean; message?: string; data?: unknown; confidence?: number;
  sources?: Array<{ type: string; label: string; reference?: string }>;
  actions?: Array<{ type: string; entity: string; description: string }>;
  chainTo?: string; chainInput?: unknown;
}
 
export interface IntentClassification {
  primaryAgent: AgentDomain; secondaryAgents: AgentDomain[]; skills: string[];
  confidence: number; requiresChaining: boolean; chainOrder: AgentDomain[];
  contextNeeded: string[]; userIntent: string;
}
 
export interface AIMessage {
  id: string; conversation_id: string; role: 'user' | 'assistant' | 'tool';
  content: string; agent_id: string | null; skill_id: string | null;
  tool_calls: unknown | null; metadata: Record<string, unknown>; created_at: string;
}
// BID_STAGES array — ordered list of stages for Kanban column rendering
export const BID_STAGES: BidStage[] = [
  'lead',
  'estimating', 
  'review',
  'submitted',
  'won',
  'lost',
];