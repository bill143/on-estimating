// @on/ocr-engine — Table Extractor: Docling TableFormer bridge

import type {
  PreProcessedSheet,
  ExtractedTable,
  GatewayExtractTablesRequest,
  GatewayExtractTablesResponse,
} from './types';

const GATEWAY_URL = process.env.OCR_GATEWAY_URL ?? 'http://localhost:8001';
const TABLE_EXTRACT_TIMEOUT_MS = 60_000;

/**
 * Extract structured tables from a plan sheet using Docling with TableFormer.
 * Detects schedule tables, door/window schedules, finish schedules,
 * keynote legends, and material lists.
 */
export async function extractTables(
  preprocessed: PreProcessedSheet,
  sheetId: string
): Promise<ExtractedTable[]> {
  const payload: GatewayExtractTablesRequest = {
    file_url: preprocessed.normalizedUrl,
    sheet_id: sheetId,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TABLE_EXTRACT_TIMEOUT_MS);

  try {
    const response = await fetch(`${GATEWAY_URL}/extract-tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Table extraction gateway returned ${response.status}: ${body}`
      );
    }

    const data: GatewayExtractTablesResponse = await response.json();
    return data.tables;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Table extraction timed out after ${TABLE_EXTRACT_TIMEOUT_MS}ms for sheet ${sheetId}`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
