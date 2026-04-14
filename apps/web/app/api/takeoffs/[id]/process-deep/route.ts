// NEXUS Estimating — Deep OCR Processing Trigger
// POST /api/takeoffs/[id]/process-deep — returns 202 Accepted, processes in background

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    const takeoff = await prisma.takeoff.findUnique({
      where: { id: takeoffId },
      include: { planPage: { include: { planSet: true } } },
    });

    if (!takeoff) {
      return NextResponse.json({ error: 'Takeoff not found' }, { status: 404 });
    }

    const storagePath = takeoff.planPage.storagePath;
    const { data: signedUrlData } = await supabase.storage
      .from('plans')
      .createSignedUrl(storagePath, 3600);

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json({ error: 'Could not generate signed URL for plan sheet' }, { status: 500 });
    }

    await prisma.planPage.update({
      where: { id: takeoff.planPageId },
      data: { processingState: 'PROCESSING' },
    });

    let confidenceThreshold = 0.75;
    try {
      const body = await request.json();
      if (body.confidenceThreshold && typeof body.confidenceThreshold === 'number') {
        confidenceThreshold = body.confidenceThreshold;
      }
    } catch {
      // No body — use default
    }

    // @ts-ignore — @on/ocr-engine resolves at runtime via workspace link
    import('@on/ocr-engine').then(({ processPlanSheet }: { processPlanSheet: (id: string, url: string, opts: { fastPassOnly: boolean; confidenceThreshold: number }) => Promise<unknown> }) => {
      processPlanSheet(takeoff.planPageId, signedUrlData.signedUrl, {
        fastPassOnly: false,
        confidenceThreshold,
      }).catch((err: unknown) => {
        console.error(`[Deep pass failed] takeoff=${takeoffId} planPage=${takeoff.planPageId}`, err);
        prisma.planPage
          .update({ where: { id: takeoff.planPageId }, data: { processingState: 'FAILED' } })
          .catch(() => {});
      });
    });

    return NextResponse.json(
      { message: 'Deep pass processing started', takeoffId, planPageId: takeoff.planPageId, confidenceThreshold },
      { status: 202 }
    );
  } catch (error) {
    console.error('[POST /api/takeoffs/[id]/process-deep]', error);
    return NextResponse.json({ error: 'Failed to start deep pass processing' }, { status: 500 });
  }
}
