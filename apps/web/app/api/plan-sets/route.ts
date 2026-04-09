// NEXUS Estimating — Plan Sets API Route
// GET  /api/plan-sets        — list plan sets for a project
// POST /api/plan-sets        — create a new plan set (metadata only — file goes to Supabase Storage)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ─── Validation ──────────────────────────────────────────────────────────────

const CreatePlanSetSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  name: z.string().min(1).max(200),
  version: z.string().max(20).default('1.0'),
  description: z.string().max(1000).optional(),
  // Array of pages to create alongside the plan set
  pages: z.array(z.object({
    pageNumber: z.number().int().min(1),
    fileName: z.string().min(1),
    storagePath: z.string().min(1), // path in Supabase Storage
    thumbnailPath: z.string().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    dpi: z.number().int().optional(),
  })).default([]),
});

// ─── GET /api/plan-sets ──────────────────────────────────────────────────────

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
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: member.organizationId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const planSets = await prisma.planSet.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
          select: {
            id: true,
            pageNumber: true,
            fileName: true,
            storagePath: true,
            thumbnailPath: true,
            width: true,
            height: true,
            processingState: true,
          },
        },
        _count: { select: { pages: true } },
      },
    });

    // Generate signed URLs for thumbnails
    const planSetsWithUrls = await Promise.all(
      planSets.map(async (planSet: any) => {
        const pagesWithUrls = await Promise.all(
          planSet.pages.map(async (page: any) => {
            let signedUrl = null;
            if (page.thumbnailPath || page.storagePath) {
              const path = page.thumbnailPath || page.storagePath;
              const { data } = await supabase.storage
                .from('plans')
                .createSignedUrl(path, 3600); // 1 hour expiry
              signedUrl = data?.signedUrl || null;
            }
            return { ...page, signedUrl };
          })
        );
        return { ...planSet, pages: pagesWithUrls };
      })
    );

    return NextResponse.json({ data: planSetsWithUrls });

  } catch (error) {
    console.error('[GET /api/plan-sets]', error);
    return NextResponse.json({ error: 'Failed to fetch plan sets' }, { status: 500 });
  }
}

// ─── POST /api/plan-sets ─────────────────────────────────────────────────────

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
    const parsed = CreatePlanSetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, name, version, description, pages } = parsed.data;

    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: member.organizationId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create plan set with pages in a transaction
    const planSet = await prisma.planSet.create({
      data: {
        projectId,
        name,
        version,
        description: description ?? null,
        uploadedBy: user.id,
        pages: {
          create: pages.map((page) => ({
            pageNumber: page.pageNumber,
            fileName: page.fileName,
            storagePath: page.storagePath,
            thumbnailPath: page.thumbnailPath ?? null,
            width: page.width ?? null,
            height: page.height ?? null,
            dpi: page.dpi ?? null,
            processingState: 'PENDING' as const,
          })),
        },
      },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: member.organizationId,
        userId: user.id,
        action: 'PLAN_SET_CREATED',
        entityType: 'plan_set',
        entityId: planSet.id,
        changes: { name, pageCount: pages.length, projectId },
      },
    });

    return NextResponse.json({ data: planSet }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/plan-sets]', error);
    return NextResponse.json({ error: 'Failed to create plan set' }, { status: 500 });
  }
}
