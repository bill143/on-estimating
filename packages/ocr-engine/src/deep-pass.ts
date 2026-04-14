// @on/ocr-engine — Deep Pass: MinerU 2.5 + PaddleOCR-VL via Python gateway
// Target: 94.5% accuracy for full takeoff_items DB write

import type {
  PreProcessedSheet,
  DeepPassResult,
  GatewayDeepPassRequest,
  GatewayDeepPassResponse,
} from './types';

const GATEWAY_URL = process.env.OCR_GATEWAY_URL ?? 'http://localhost:8001';
const DEEP_PASS_TIMEOUT_MS = 120_000; // Deep pass can take up to 2 minutes per sheet

/**
 * Run MinerU two-stage pipeline + PaddleOCR-VL-0.9B for element-level accuracy.
 * Returns structured text, detected elements, keynotes, and per-element confidence map.
 */
export async function runDeepPass(
  preprocessed: PreProcessedSheet,
  sheetId: string
): Promise<DeepPassResult> {
  const startTime = Date.now();

  const payload: GatewayDeepPassRequest = {
    file_url: preprocessed.normalizedUrl,
    sheet_id: sheetId,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEP_PASS_TIMEOUT_MS);

  try {
    const response = await fetch(`${GATEWAY_URL}/deep-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Deep pass gateway returned ${response.status}: ${body}`
      );
    }

    const data: GatewayDeepPassResponse = await response.json();

    return {
      text: data.text,
      elements: data.elements,
      keynotes: data.keynotes,
      confidenceMap: data.confidence_map,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Deep pass timed out after ${DEEP_PASS_TIMEOUT_MS}ms for sheet ${sheetId}`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
