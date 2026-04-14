// NEXUS Estimating — Takeoff Items API
// GET /api/takeoffs/[id]/items

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const authDisabled = process.env.AUTH_DISABLED === 'true';
    const userId = user?.id ?? (authDisabled ? 'dev-user-00000000-0000-0000-0000-000000000001' : null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const takeoffId = params.id;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = supabase
      .from('takeoff_items')
      .select('*')
      .eq('takeoff_id', takeoffId)
      .order('created_at', { ascending: true });

    if (statusFilter && ['pending', 'flagged', 'approved'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch takeoff items' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], count: data?.length ?? 0, takeoffId, filter: statusFilter ?? 'all' });
  } catch (error) {
    console.error('[GET /api/takeoffs/[id]/items]', error);
    return NextResponse.json({ error: 'Failed to fetch takeoff items' }, { status: 500 });
  }
}
