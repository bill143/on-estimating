// NEXUS Estimating — Takeoffs API Route
// GET  /api/takeoffs   — list takeoff measurements for a plan page
// POST /api/takeoffs   — save a new measurement from the plan viewer

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase as createServerSupabaseClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ─── Validation ──────────────────────────────────────────────────────────────

const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const CreateTakeoffSchema = z.object({
  planPageId: z.string().uuid(),
  estimateId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  type: z.enum(['AREA', 'LINEAR', 'COUNT', 'VOLUME']),
  // The raw canvas points for rendering the overlay
  points: z.array(PointSchema),
  // Calculated real-world value (already converted from pixels)
  quantity: z.number().min(0),
  unit: z.string().min(1).max(20),
  // Visual
  color: z.string().optional(),
  notes: z.string().optional(),
  // AI metadata
  isAiGenerated: z.boolean().default(false),
  confidence: z.number().min(0).max(1).optional(),
  // CSI code if known (from the active tool context)
  csiCode: z.string().optional(),
  // Page context
  pageIndex: z.number().int().min(0).default(0),
  // Scale used at time of measurement
  pixelsPerUnit: z.number().optional(),
  scaleUnit: z.string().optional(),
});

// ─── GET /api/takeoffs ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const planPageId = searchParams.get('planPageId');
    const estimateId = searchParams.get('estimateId');

    if (!planPageId && !estimateId) {
      return NextResponse.json(
        { error: 'planPageId or estimateId is required' },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {};
    if (planPageId) where.planPageId = planPageId;
    if (estimateId) where.estimateId = estimateId;

    const takeoffs = await prisma.takeoff.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: takeoffs });

  } catch (error) {
    console.error('[GET /api/takeoffs]', error);
    return NextResponse.json({ error: 'Failed to fetch takeoffs' }, { status: 500 });
  }
}

// ─── POST /api/takeoffs ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CreateTakeoffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      planPageId, estimateId, name, type,
      points, quantity, unit, color, notes,
      isAiGenerated, confidence, csiCode,
      pageIndex, pixelsPerUnit, scaleUnit,
    } = parsed.data;

    // Store all canvas data + metadata in the JSON data field
    const takeoffData = {
      points,
      pageIndex,
      csiCode: csiCode ?? null,
      pixelsPerUnit: pixelsPerUnit ?? null,
      scaleUnit: scaleUnit ?? null,
    };

    const takeoff = await prisma.takeoff.create({
      data: {
        planPageId,
        estimateId: estimateId ?? null,
        name,
        type,
        data: takeoffData,
        quantity,
        unit,
        color: color ?? null,
        notes: notes ?? null,
        createdBy: user.id,
        isAiGenerated,
        confidence: confidence ?? null,
      },
    });

    // If linked to an estimate, optionally auto-create a line item
    if (estimateId && csiCode) {
      // Look up the CSI cost code for auto-pricing
      const costCode = await prisma.costCode.findFirst({
        where: {
          organizationId: member.organizationId,
          code: { contains: csiCode },
          isActive: true,
        },
      });

      const unitCost = costCode
        ? Number(costCode.materialRate ?? 0) + Number(costCode.laborRate ?? 0) + Number(costCode.equipmentRate ?? 0)
        : 0;

      await prisma.estimateLineItem.create({
        data: {
          estimateId,
          takeoffId: takeoff.id,
          costCodeId: costCode?.id ?? null,
          description: costCode?.description ?? name,
          quantity,
          unit,
          unitCost,
          laborCost: quantity * Number(costCode?.laborRate ?? 0),
          materialCost: quantity * Number(costCode?.materialRate ?? 0),
          equipmentCost: quantity * Number(costCode?.equipmentRate ?? 0),
          subCost: 0,
          otherCost: 0,
          totalCost: quantity * unitCost,
          sortOrder: 0,
          notes: JSON.stringify({
            rowType: 'line_item',
            csiCode: csiCode ?? '',
            fromTakeoffId: takeoff.id,
          }),
        },
      });
    }

    return NextResponse.json({ data: takeoff }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/takeoffs]', error);
    return NextResponse.json({ error: 'Failed to save takeoff' }, { status: 500 });
  }
}
