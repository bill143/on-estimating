// @on/ocr-engine — Database writer: takeoff_items Supabase inserts
// Resolves the critical audit gap: OCR items detected but never persisted

import { createClient } from '@supabase/supabase-js';
import type { CsiMappedItem, WriteResult, TakeoffItemRow } from './types';
import { resolveStatus } from './confidence';

const DEV_USER_ID = 'dev-user-00000000-0000-0000-0000-000000000001';
const BATCH_SIZE = 50;

/**
 * Create a Supabase service-role client for server-side writes.
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required'
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Generate a cuid-like ID.
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `ti_${timestamp}${random}`;
}

/**
 * Resolve the current user ID for the created_by column.
 */
function resolveUserId(userId?: string): string {
  if (userId) return userId;
  return DEV_USER_ID;
}

/**
 * Look up the takeoff_id from a plan page's associated takeoff record.
 */
async function lookupTakeoffId(
  supabase: ReturnType<typeof getServiceClient>,
  planPageId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('takeoffs')
    .select('id')
    .eq('plan_page_id', planPageId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return (data as Record<string, string>).id;
}

/**
 * Write OCR-detected takeoff items to the takeoff_items table.
 */
export async function writeTakeoffItems(
  planPageId: string,
  items: CsiMappedItem[],
  confidenceThreshold: number = 0.75,
  userId?: string
): Promise<WriteResult> {
  if (items.length === 0) {
    return { inserted: 0, flagged: 0, errors: [] };
  }

  const supabase = getServiceClient();
  const resolvedUserId = resolveUserId(userId);
  const errors: string[] = [];
  let totalInserted = 0;
  let totalFlagged = 0;

  const takeoffId = await lookupTakeoffId(supabase, planPageId);

  const rows: TakeoffItemRow[] = items.map((item) => {
    const status = resolveStatus(item.confidence, confidenceThreshold);
    if (status === 'flagged') totalFlagged++;

    return {
      id: generateId(),
      takeoff_id: takeoffId ?? '',
      plan_page_id: planPageId,
      shape_type: item.shapeType,
      geometry: {
        x: item.geometry.x,
        y: item.geometry.y,
        width: item.geometry.width,
        height: item.geometry.height,
      },
      quantity: item.quantity,
      unit: item.unit,
      csi_code: item.csiCode,
      label: item.label.substring(0, 500),
      confidence: item.confidence,
      status,
      source_stage: item.sourceStage,
      created_by: resolvedUserId,
      created_at: new Date().toISOString(),
    };
  });

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error: insertError } = await supabase
      .from('takeoff_items')
      .insert(batch);

    if (insertError) {
      errors.push(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${insertError.message}`
      );

      for (const row of batch) {
        const { error: singleError } = await supabase
          .from('takeoff_items')
          .insert(row);

        if (singleError) {
          errors.push(`Row ${row.id} failed: ${singleError.message}`);
        } else {
          totalInserted++;
        }
      }
    } else {
      totalInserted += batch.length;
    }
  }

  if (totalInserted > 0) {
    await supabase
      .channel(`takeoff:${planPageId}`)
      .send({
        type: 'broadcast',
        event: 'items_written',
        payload: {
          plan_page_id: planPageId,
          items_count: totalInserted,
          flagged_count: totalFlagged,
          timestamp: new Date().toISOString(),
        },
      })
      .catch(() => {});
  }

  return {
    inserted: totalInserted,
    flagged: totalFlagged,
    errors,
  };
}
