// @on/ocr-engine — Fast Pass: Marker + Surya OCR via Python gateway
// Target: 20-120 pages/sec for immediate canvas preview

import type {
  PreProcessedSheet,
  FastPassResult,
  GatewayFastPassRequest,
  GatewayFastPassResponse,
} from './types';

const GATEWAY_URL = process.env.OCR_GATEWAY_URL ?? 'http://localhost:8001';
const FAST_PASS_TIMEOUT_MS = 15_000;

/**
 * Run Marker + Surya OCR on a preprocessed plan sheet.
 * Returns structured text, layout blocks, and reading order for
 * immediate canvas preview rendering.
 */
export async function runFastPass(
  preprocessed: PreProcessedSheet,
  sheetId: string
): Promise<FastPassResult> {
  const startTime = Date.now();

  const payload: GatewayFastPassRequest = {
    file_url: preprocessed.normalizedUrl,
    sheet_id: sheetId,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FAST_PASS_TIMEOUT_MS);

  try {
    const response = await fetch(`${GATEWAY_URL}/fast-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Fast pass gateway returned ${response.status}: ${body}`
      );
    }

    const data: GatewayFastPassResponse = await response.json();

    return {
      text: data.text,
      layout: data.layout,
      readingOrder: data.reading_order,
      pageCount: data.page_count,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Fast pass timed out after ${FAST_PASS_TIMEOUT_MS}ms for sheet ${sheetId}`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
