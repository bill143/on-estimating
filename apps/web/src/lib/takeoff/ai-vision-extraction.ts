// ============================================================
// TAKEOFF MODULE — AI VISION EXTRACTION (Dual-Model)
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/takeoff/ai-vision-extraction.ts
//
// EXCLUSIVE DIFFERENTIATOR: Claude Vision + GPT-4o Vision in
// parallel. Results are reconciled into a consensus detection
// list with per-item agreement scoring.
// ============================================================

import type {
  AIDetectionResult,
  DualModelResult,
  ExtractionRequest,
  CreateTakeoffItemRequest,
  UnitType,
} from '@/types/takeoff.types'
import { linkSymbolToCSI } from './dynamic-linker'
import { validateBatch } from './validation-engine'

// ─── System prompts ───────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are an expert construction estimator and plan reader with 20+ years of experience reading federal construction plans for VA, NAVFAC, USACE, GSA, and DHS projects.

Analyze the construction plan image provided and detect ALL construction elements, symbols, fixtures, and components visible.

For each detected item, return a JSON array with this exact structure:
{
  "symbol_description": "clear description of what was detected",
  "bounding_box": { "x": 0, "y": 0, "width": 100, "height": 100 },
  "suggested_csi_code": "XX XX XX",
  "suggested_csi_description": "CSI MasterFormat description",
  "confidence": 0.0 to 1.0,
  "raw_label": "shortest label for this item"
}

Rules:
- Return ONLY valid JSON array, no markdown, no explanation text
- Confidence 0.9+ = clearly visible and identifiable
- Confidence 0.7-0.89 = visible but may need verification  
- Confidence below 0.7 = unclear or partially visible
- Use CSI MasterFormat 2016 division codes (e.g. "09 20 00")
- Bounding box coordinates are in percentage of image dimensions (0-100)
- Focus on quantifiable construction items: doors, windows, fixtures, structural elements
- Include count symbols (outlets, fixtures, sprinklers) as individual point detections`

const FOCUS_TRADE_ADDENDUM = (trades: string[]) =>
  `\n\nFocus especially on: ${trades.join(', ')} trades. Flag items from other trades but prioritize these.`

// ─── Public API ───────────────────────────────────────────────

/**
 * Run dual-model extraction: Claude Vision + GPT-4o in parallel.
 * Returns reconciled consensus detections.
 */
export async function extractWithDualModel(
  request: ExtractionRequest
): Promise<DualModelResult> {
  const startTime = Date.now()

  const systemPrompt =
    EXTRACTION_SYSTEM_PROMPT +
    (request.trade_focus ? FOCUS_TRADE_ADDENDUM(request.trade_focus) : '')

  // Run both models in parallel
  const [claudeResult, gpt4oResult] = await Promise.allSettled([
    runClaudeVision(request.image_base64, systemPrompt),
    runGPT4oVision(request.image_base64, systemPrompt),
  ])

  const claudeDetections =
    claudeResult.status === 'fulfilled' ? claudeResult.value : []
  const gpt4oDetections =
    gpt4oResult.status === 'fulfilled' ? gpt4oResult.value : []

  // Log partial failures but don't throw — degrade gracefully
  if (claudeResult.status === 'rejected') {
    console.warn('[DualModel] Claude Vision failed:', claudeResult.reason)
  }
  if (gpt4oResult.status === 'rejected') {
    console.warn('[DualModel] GPT-4o Vision failed:', gpt4oResult.reason)
  }

  // If both fail, throw
  if (claudeDetections.length === 0 && gpt4oDetections.length === 0) {
    throw new Error('Both AI models failed to return detections — check API keys and image quality')
  }

  const consensus = reconcileDetections(claudeDetections, gpt4oDetections)
  const agreementScore = computeAgreementScore(claudeDetections, gpt4oDetections, consensus)

  return {
    claude_detections: claudeDetections,
    gpt4o_detections: gpt4oDetections,
    consensus_detections: consensus,
    agreement_score: Math.round(agreementScore * 100) / 100,
    processing_time_ms: Date.now() - startTime,
  }
}

/**
 * Convert consensus detections into CreateTakeoffItemRequest records
 * ready to save to the database.
 */
export function detectionsToTakeoffItems(
  detections: AIDetectionResult[],
  planSheetId: string,
  existingCsiCodes: string[] = []
): CreateTakeoffItemRequest[] {
  return detections.map((detection, index) => {
    const link = linkSymbolToCSI(
      detection.symbol_description,
      detection.suggested_csi_code,
      existingCsiCodes
    )

    // Merge AI detection confidence with CSI link confidence
    const mergedConfidence = (detection.confidence * 0.6 + link.confidence * 0.4)

    return {
      plan_sheet_id: planSheetId,
      shape_type: 'count',        // Default for AI detections — canvas overrides this
      geometry: {
        type: 'count',
        points: [
          {
            x: detection.bounding_box.x + detection.bounding_box.width / 2,
            y: detection.bounding_box.y + detection.bounding_box.height / 2,
          },
        ],
        count: 1,
      },
      quantity: 1,
      unit: link.unit,
      csi_code: link.csi_code,
      csi_description: link.csi_description,
      label: detection.raw_label || detection.symbol_description,
      confidence: Math.round(mergedConfidence * 100) / 100,
      status: mergedConfidence >= 0.85 ? 'pending_review' : 'ai_detected',
    } satisfies CreateTakeoffItemRequest
  })
}

// ─── Claude Vision ────────────────────────────────────────────

async function runClaudeVision(
  imageBase64: string,
  systemPrompt: string
): Promise<AIDetectionResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Detect and list all construction elements visible in this plan. Return JSON array only.',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  return parseDetectionJSON(text, 'claude')
}

// ─── GPT-4o Vision ───────────────────────────────────────────

async function runGPT4oVision(
  imageBase64: string,
  systemPrompt: string
): Promise<AIDetectionResult[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'Detect and list all construction elements visible in this plan. Return JSON array only.',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`GPT-4o API ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  return parseDetectionJSON(text, 'gpt4o')
}

// ─── Reconciliation ───────────────────────────────────────────

/**
 * Merge Claude and GPT-4o detections into a consensus list.
 *
 * Strategy:
 * - If both models detected the same thing (CSI code match within similar bbox),
 *   merge into one item with boosted confidence
 * - If only one model detected it, include with reduced confidence
 * - Sort by confidence descending
 */
function reconcileDetections(
  claudeDetections: AIDetectionResult[],
  gpt4oDetections: AIDetectionResult[]
): AIDetectionResult[] {
  const consensus: AIDetectionResult[] = []
  const gpt4oMatched = new Set<number>()

  for (const claudeItem of claudeDetections) {
    // Find a matching GPT-4o detection (same CSI code + overlapping bbox)
    let bestMatchIndex = -1
    let bestOverlap = 0

    gpt4oDetections.forEach((gptItem, idx) => {
      if (gpt4oMatched.has(idx)) return
      if (normalizeCSI(claudeItem.suggested_csi_code) !== normalizeCSI(gptItem.suggested_csi_code)) return

      const overlap = bboxOverlapRatio(claudeItem.bounding_box, gptItem.bounding_box)
      if (overlap > 0.3 && overlap > bestOverlap) {
        bestOverlap = overlap
        bestMatchIndex = idx
      }
    })

    if (bestMatchIndex >= 0) {
      // Both models agree — boost confidence
      const gptItem = gpt4oDetections[bestMatchIndex]
      gpt4oMatched.add(bestMatchIndex)
      consensus.push({
        symbol_description: claudeItem.symbol_description,
        bounding_box: mergeBoundingBoxes(claudeItem.bounding_box, gptItem.bounding_box),
        suggested_csi_code: claudeItem.suggested_csi_code,
        suggested_csi_description: claudeItem.suggested_csi_description,
        confidence: Math.min(0.98, (claudeItem.confidence + gptItem.confidence) / 2 + 0.10),
        model_source: 'claude',    // consensus — claude is primary label
        raw_label: claudeItem.raw_label,
      })
    } else {
      // Claude only — moderate penalty
      consensus.push({
        ...claudeItem,
        confidence: claudeItem.confidence * 0.85,
        model_source: 'claude',
      })
    }
  }

  // Add unmatched GPT-4o items
  gpt4oDetections.forEach((gptItem, idx) => {
    if (gpt4oMatched.has(idx)) return
    consensus.push({
      ...gptItem,
      confidence: gptItem.confidence * 0.85,
      model_source: 'gpt4o',
    })
  })

  // Sort by confidence descending
  return consensus.sort((a, b) => b.confidence - a.confidence)
}

function computeAgreementScore(
  claude: AIDetectionResult[],
  gpt4o: AIDetectionResult[],
  consensus: AIDetectionResult[]
): number {
  if (claude.length === 0 && gpt4o.length === 0) return 0
  if (claude.length === 0 || gpt4o.length === 0) return 0.3

  // Agreement = items where both models matched / total unique items
  const bothAgreed = consensus.filter(
    c => claude.some(cl => normalizeCSI(cl.suggested_csi_code) === normalizeCSI(c.suggested_csi_code)) &&
         gpt4o.some(g => normalizeCSI(g.suggested_csi_code) === normalizeCSI(c.suggested_csi_code))
  ).length

  const total = consensus.length
  return total > 0 ? bothAgreed / total : 0
}

// ─── JSON parsing ─────────────────────────────────────────────

function parseDetectionJSON(
  text: string,
  modelSource: 'claude' | 'gpt4o'
): AIDetectionResult[] {
  try {
    // Strip markdown code blocks if present
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    const items = Array.isArray(parsed) ? parsed : (parsed.detections ?? parsed.items ?? [])

    return items
      .filter((item: unknown) => item && typeof item === 'object')
      .map((item: Record<string, unknown>) => ({
        symbol_description: String(item.symbol_description ?? item.description ?? ''),
        bounding_box: sanitizeBoundingBox(item.bounding_box as Record<string, number> | undefined),
        suggested_csi_code: String(item.suggested_csi_code ?? item.csi_code ?? '00 00 00'),
        suggested_csi_description: String(item.suggested_csi_description ?? item.csi_description ?? ''),
        confidence: clamp(Number(item.confidence ?? 0.5), 0, 1),
        model_source: modelSource,
        raw_label: String(item.raw_label ?? item.label ?? item.symbol_description ?? ''),
      } satisfies AIDetectionResult))
  } catch {
    console.warn(`[AI Vision] Could not parse JSON from ${modelSource}:`, text.slice(0, 200))
    return []
  }
}

// ─── Geometry helpers ─────────────────────────────────────────

function bboxOverlapRatio(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  const intersection = xOverlap * yOverlap
  const aArea = a.width * a.height
  const bArea = b.width * b.height
  const union = aArea + bArea - intersection
  return union > 0 ? intersection / union : 0
}

function mergeBoundingBoxes(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  const x = (a.x + b.x) / 2
  const y = (a.y + b.y) / 2
  const width = (a.width + b.width) / 2
  const height = (a.height + b.height) / 2
  return { x, y, width, height }
}

function sanitizeBoundingBox(
  bbox: Record<string, number> | undefined
): { x: number; y: number; width: number; height: number } {
  if (!bbox) return { x: 0, y: 0, width: 10, height: 10 }
  return {
    x: clamp(Number(bbox.x ?? 0), 0, 100),
    y: clamp(Number(bbox.y ?? 0), 0, 100),
    width: clamp(Number(bbox.width ?? 5), 0, 100),
    height: clamp(Number(bbox.height ?? 5), 0, 100),
  }
}

function normalizeCSI(code: string): string {
  return (code ?? '').replace(/\s+/g, '').toUpperCase()
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
