// NEXUS Estimating — Organization Settings API
// GET   /api/settings  — read org settings
// PATCH /api/settings  — update org settings

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  ueiNumber: z.string().max(50).optional(),
  cageCode: z.string().max(20).optional(),
  sdvosbCertified: z.boolean().optional(),
  defaultOverheadPct: z.number().min(0).max(100).optional(),
  defaultProfitPct: z.number().min(0).max(100).optional(),
  defaultBondPct: z.number().min(0).max(100).optional(),
  defaultInsurancePct: z.number().min(0).max(100).optional(),
  defaultContingencyPct: z.number().min(0).max(100).optional(),
  defaultLaborBurdenPct: z.number().min(0).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  region: z.string().max(100).optional(),
});

// ─── GET /api/settings ──────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const authDisabled = process.env.AUTH_DISABLED === 'true';

    if (!authDisabled && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user's org
    let orgId: string | null = null;
    if (user) {
      const member = await prisma.orgMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      orgId = member?.organizationId ?? null;
    }

    if (!orgId) {
      // When auth is disabled or no org, return defaults
      return NextResponse.json({
        data: {
          companyName: '',
          ueiNumber: '',
          cageCode: '',
          sdvosbCertified: false,
          defaultOverheadPct: 10,
          defaultProfitPct: 10,
          defaultBondPct: 1.5,
          defaultInsurancePct: 2.0,
          defaultContingencyPct: 0,
          defaultLaborBurdenPct: 0,
          logoUrl: null,
          region: '',
        },
      });
    }

    const settings = await prisma.organizationSettings.findUnique({
      where: { orgId },
    });

    if (!settings) {
      // Create default settings for the org
      const created = await prisma.organizationSettings.create({
        data: { orgId },
      });
      return NextResponse.json({ data: mapSettings(created) });
    }

    return NextResponse.json({ data: mapSettings(settings) });
  } catch (error) {
    console.error('[GET /api/settings]', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// ─── PATCH /api/settings ────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const authDisabled = process.env.AUTH_DISABLED === 'true';

    if (!authDisabled && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let orgId: string | null = null;
    if (user) {
      const member = await prisma.orgMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      orgId = member?.organizationId ?? null;
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    const settings = await prisma.organizationSettings.upsert({
      where: { orgId },
      create: {
        orgId,
        ...(updates.companyName !== undefined && { companyName: updates.companyName }),
        ...(updates.ueiNumber !== undefined && { ueiNumber: updates.ueiNumber }),
        ...(updates.cageCode !== undefined && { cageCode: updates.cageCode }),
        ...(updates.sdvosbCertified !== undefined && { sdvosbCertified: updates.sdvosbCertified }),
        ...(updates.defaultOverheadPct !== undefined && { defaultOverheadPct: updates.defaultOverheadPct }),
        ...(updates.defaultProfitPct !== undefined && { defaultProfitPct: updates.defaultProfitPct }),
        ...(updates.defaultBondPct !== undefined && { defaultBondPct: updates.defaultBondPct }),
        ...(updates.defaultInsurancePct !== undefined && { defaultInsurancePct: updates.defaultInsurancePct }),
        ...(updates.defaultContingencyPct !== undefined && { defaultContingencyPct: updates.defaultContingencyPct }),
        ...(updates.defaultLaborBurdenPct !== undefined && { defaultLaborBurdenPct: updates.defaultLaborBurdenPct }),
        ...(updates.logoUrl !== undefined && { logoUrl: updates.logoUrl }),
        ...(updates.region !== undefined && { region: updates.region }),
      },
      update: {
        ...(updates.companyName !== undefined && { companyName: updates.companyName }),
        ...(updates.ueiNumber !== undefined && { ueiNumber: updates.ueiNumber }),
        ...(updates.cageCode !== undefined && { cageCode: updates.cageCode }),
        ...(updates.sdvosbCertified !== undefined && { sdvosbCertified: updates.sdvosbCertified }),
        ...(updates.defaultOverheadPct !== undefined && { defaultOverheadPct: updates.defaultOverheadPct }),
        ...(updates.defaultProfitPct !== undefined && { defaultProfitPct: updates.defaultProfitPct }),
        ...(updates.defaultBondPct !== undefined && { defaultBondPct: updates.defaultBondPct }),
        ...(updates.defaultInsurancePct !== undefined && { defaultInsurancePct: updates.defaultInsurancePct }),
        ...(updates.defaultContingencyPct !== undefined && { defaultContingencyPct: updates.defaultContingencyPct }),
        ...(updates.defaultLaborBurdenPct !== undefined && { defaultLaborBurdenPct: updates.defaultLaborBurdenPct }),
        ...(updates.logoUrl !== undefined && { logoUrl: updates.logoUrl }),
        ...(updates.region !== undefined && { region: updates.region }),
      },
    });

    return NextResponse.json({ data: mapSettings(settings) });
  } catch (error) {
    console.error('[PATCH /api/settings]', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSettings(s: any) {
  return {
    companyName: s.companyName ?? '',
    ueiNumber: s.ueiNumber ?? '',
    cageCode: s.cageCode ?? '',
    sdvosbCertified: s.sdvosbCertified ?? false,
    defaultOverheadPct: Number(s.defaultOverheadPct ?? 10),
    defaultProfitPct: Number(s.defaultProfitPct ?? 10),
    defaultBondPct: Number(s.defaultBondPct ?? 1.5),
    defaultInsurancePct: Number(s.defaultInsurancePct ?? 2.0),
    defaultContingencyPct: Number(s.defaultContingencyPct ?? 0),
    defaultLaborBurdenPct: Number(s.defaultLaborBurdenPct ?? 0),
    logoUrl: s.logoUrl ?? null,
    region: s.region ?? '',
  };
}
