import { z } from 'zod';

export const BID_STAGES = ['lead', 'estimating', 'review', 'submitted', 'won', 'lost'] as const;
export type BidStage = (typeof BID_STAGES)[number];

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Project name is required'),
  client: z.string().min(1, 'Client name is required'),
  address: z.string().nullable().optional(),
  value: z.number().min(0).default(0),
  stage: z.enum(BID_STAGES).default('lead'),
  bid_due_date: z.string().nullable().optional(),
  trade_scope: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  confidence: z.number().min(0).max(100).nullable().optional(),
});

export type Project = z.infer<typeof projectSchema>;

export const bidSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  name: z.string().min(1),
  status: z.enum(['draft', 'in_review', 'approved', 'rejected']).default('draft'),
  total: z.number().default(0),
  markup_percent: z.number().default(10),
  tax_percent: z.number().default(8.5),
});

export type Bid = z.infer<typeof bidSchema>;

export const STAGE_CONFIG: Record<BidStage, { label: string; color: string; bgColor: string }> = {
  lead: { label: 'Lead', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  estimating: { label: 'Estimating', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  review: { label: 'Review', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  submitted: { label: 'Submitted', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  won: { label: 'Won', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
};
