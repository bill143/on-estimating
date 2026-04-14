// NEXUS Estimating — Takeoff Item Update API
// PATCH /api/takeoffs/[id]/items/[itemId]

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { z } from 'zod';

const UpdateItemSchema = z.object({
  status: z.enum(['pending', 'flagged', 'approved']).optional(),
  override_qty: z.number().min(0).optional(),
  override_reason: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const authDisabled = process.env.AUTH_DISABLED === 'true';
    const userId = user?.id ?? (authDisabled ? 'dev-user-00000000-0000-0000-0000-000000000001' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
      if (parsed.data.status === 'approved' || parsed.data.status === 'flagged') {
        updates.reviewed_by = userId;
        updates.reviewed_at = new Date().toISOString();
      }
    }
    if (parsed.data.override_qty !== undefined) updates.override_qty = parsed.data.override_qty;
    if (parsed.data.override_reason !== undefined) updates.override_reason = parsed.data.override_reason;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('takeoff_items')
      .update(updates)
      .eq('id', params.itemId)
      .eq('takeoff_id', params.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Takeoff item not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[PATCH /api/takeoffs/[id]/items/[itemId]]', error);
    return NextResponse.json({ error: 'Failed to update takeoff item' }, { status: 500 });
  }
}
