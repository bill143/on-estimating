// @on/ocr-engine — Main pipeline orchestrator
// 7-stage dual-engine OCR pipeline for construction plan takeoff

import type {
  ProcessPlanSheetOpts,
  OcrResult,
  PreProcessedSheet,
  FastPassResult,
  DeepPassResult,
  ExtractedTable,
  DetectedSymbol,
  ParsedDimensionResult,
  CsiMappedItem,
} from './types';
import { preProcess } from './pre-processor';
import { runFastPass } from './fast-pass';
import { runDeepPass } from './deep-pass';
import { extractTables } from './table-extractor';
import { detectConstructionSymbols } from './symbol-detector';
import { mapToCSI } from './csi-mapper';
import { writeTakeoffItems } from './db-writer';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;

// ─── Dimension Parsing ───────────────────────────────────────────────────────

function parseDimensions(text: string): ParsedDimensionResult[] {
  const results: ParsedDimensionResult[] = [];
  const seen = new Set<string>();

  // Feet-inches pattern
  const feetInchesPattern = /(\d+)'\s*-?\s*(\d+)\s*(?:(\d+)\s*\/\s*(\d+))?\s*"/g;
  let match: RegExpExecArray | null;

  while ((match = feetInchesPattern.exec(text)) !== null) {
    const feet = parseInt(match[1], 10);
    const inches = parseInt(match[2], 10);
    const fracNum = match[3] ? parseInt(match[3], 10) : 0;
    const fracDen = match[4] ? parseInt(match[4], 10) : 1;
    const totalInches = feet * 12 + inches + (fracDen > 0 ? fracNum / fracDen : 0);
    const totalFeet = totalInches / 12;

    const key = `${feet}-${inches}-${fracNum}/${fracDen}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        original: match[0],
        valueFeet: totalFeet,
        valueInches: totalInches,
        unit: 'feet-inches',
        isScale: false,
      });
    }
  }

  // Scale notation pattern
  const scalePattern = /(\d+)\s*\/\s*(\d+)"\s*=\s*(\d+)'\s*-?\s*(\d+)"/g;
  while ((match = scalePattern.exec(text)) !== null) {
    const scaleNum = parseInt(match[1], 10);
    const scaleDen = parseInt(match[2], 10);
    const refFeet = parseInt(match[3], 10);
    const refInches = parseInt(match[4], 10);
    const refTotalInches = refFeet * 12 + refInches;

    results.push({
      original: match[0],
      valueFeet: refTotalInches / 12,
      valueInches: refTotalInches,
      unit: 'scale',
      isScale: true,
      scaleString: `${scaleNum}/${scaleDen}"=1'-0"`,
    });
  }

  // NTS markers
  const ntsPattern = /\bNTS\b/gi;
  while ((match = ntsPattern.exec(text)) !== null) {
    results.push({
      original: 'NTS',
      valueFeet: 0,
      valueInches: 0,
      unit: 'none',
      isScale: true,
      scaleString: 'NTS',
    });
  }

  // Decimal feet
  const decimalFeetPattern = /(\d+\.?\d*)\s*(?:FT|LF)/gi;
  while ((match = decimalFeetPattern.exec(text)) !== null) {
    const feet = parseFloat(match[1]);
    const key = `decimal-${feet}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        original: match[0],
        valueFeet: feet,
        valueInches: feet * 12,
        unit: 'decimal-feet',
        isScale: false,
      });
    }
  }

  return results;
}

/**
 * Emit a Supabase Realtime event to update the canvas preview.
 */
async function updateCanvasPreview(
  planSheetId: string,
  fastResult: FastPassResult
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await supabase
    .from('plan_pages')
    .update({
      ocr_text: fastResult.text,
      ocr_confidence: fastResult.layout.length > 0
        ? fastResult.layout.reduce((sum, b) => sum + b.confidence, 0) / fastResult.layout.length
        : null,
      processing_state: 'OCR_COMPLETE',
      processed_at: new Date().toISOString(),
    })
    .eq('id', planSheetId);

  await supabase
    .channel(`plan:${planSheetId}`)
    .send({
      type: 'broadcast',
      event: 'fast_pass_complete',
      payload: {
        plan_page_id: planSheetId,
        text_length: fastResult.text.length,
        layout_count: fastResult.layout.length,
        latency_ms: fastResult.latencyMs,
      },
    })
    .catch(() => {});
}

/**
 * Main entry point: process a single plan sheet through the full OCR pipeline.
 */
export async function processPlanSheet(
  planSheetId: string,
  fileUrl: string,
  opts: ProcessPlanSheetOpts = {}
): Promise<OcrResult> {
  const startTime = Date.now();
  const threshold = opts.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  // Stage 1: Pre-process
  const preprocessed: PreProcessedSheet = preProcess(fileUrl);

  // Stage 2: Fast Pass
  const fastResult = await runFastPass(preprocessed, planSheetId);
  await updateCanvasPreview(planSheetId, fastResult);

  if (opts.fastPassOnly) {
    return {
      planSheetId,
      fastPass: fastResult,
      deepPass: null,
      tables: [],
      symbols: [],
      dimensions: parseDimensions(fastResult.text),
      csiMapped: [],
      itemsWritten: 0,
      itemsFlagged: 0,
      totalLatencyMs: Date.now() - startTime,
    };
  }

  // Stage 3: Deep Pass + Table Extraction (parallel)
  const [deepResult, tables] = await Promise.all([
    runDeepPass(preprocessed, planSheetId),
    extractTables(preprocessed, planSheetId),
  ]);

  // Stage 4: Symbol Detection
  const symbols: DetectedSymbol[] = detectConstructionSymbols(deepResult);

  // Stage 5: Dimension Parsing
  const combinedText = `${fastResult.text}\n${deepResult.text}`;
  const dimensions: ParsedDimensionResult[] = parseDimensions(combinedText);

  // Stage 6: CSI Mapping
  const csiMapped: CsiMappedItem[] = mapToCSI(symbols, deepResult.keynotes);

  // Stage 7: Database Write
  const writeResult = await writeTakeoffItems(planSheetId, csiMapped, threshold);

  // Update plan page state to final
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await supabase
      .from('plan_pages')
      .update({ processing_state: 'AI_DETECTED' })
      .eq('id', planSheetId);
  }

  return {
    planSheetId,
    fastPass: fastResult,
    deepPass: deepResult,
    tables,
    symbols,
    dimensions,
    csiMapped,
    itemsWritten: writeResult.inserted,
    itemsFlagged: writeResult.flagged,
    totalLatencyMs: Date.now() - startTime,
  };
}
