// ============================================================
// TAKEOFF MODULE — VALIDATION ENGINE
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/takeoff/validation-engine.ts
// ============================================================

import type {
  TakeoffItem,
  ValidationResult,
  ValidationFlag,
  TakeoffQASummary,
} from '@/types/takeoff.types'

// ─── Confidence thresholds ───────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  HIGH:    0.85,   // auto-approve candidate
  MEDIUM:  0.65,   // requires review
  LOW:     0.40,   // flag for manual check
  REJECT:  0.20,   // likely incorrect detection
} as const

// ─── Public API ───────────────────────────────────────────────

/**
 * Validate a single takeoff item and return confidence score + flags.
 */
export function validateItem(item: Partial<TakeoffItem>): ValidationResult {
  const flags: ValidationFlag[] = []
  let score = item.confidence ?? 0.5

  // CSI code check
  if (!item.csi_code || item.csi_code === '00 00 00') {
    flags.push({
      code: 'NO_CSI',
      message: 'No CSI code assigned — manual assignment required',
      severity: 'error',
    })
    score = Math.min(score, 0.30)
  }

  // Quantity sanity
  if (!item.quantity || item.quantity <= 0) {
    flags.push({
      code: 'ZERO_QTY',
      message: 'Quantity is zero or negative',
      severity: 'error',
    })
    score = Math.min(score, 0.25)
  }

  // Implausibly large quantity (area > 500,000 SF — likely a scale error)
  if (item.unit === 'SF' && item.quantity && item.quantity > 500_000) {
    flags.push({
      code: 'LARGE_QTY_SF',
      message: `Area of ${item.quantity.toLocaleString()} SF is unusually large — verify scale calibration`,
      severity: 'warning',
    })
    score = Math.min(score, 0.55)
  }

  // Implausibly large linear quantity (> 50,000 LF)
  if (item.unit === 'LF' && item.quantity && item.quantity > 50_000) {
    flags.push({
      code: 'LARGE_QTY_LF',
      message: `Length of ${item.quantity.toLocaleString()} LF is unusually large — verify scale calibration`,
      severity: 'warning',
    })
    score = Math.min(score, 0.55)
  }

  // Count sanity (> 10,000 each is unusual for a single annotation)
  if (item.unit === 'EA' && item.quantity && item.quantity > 10_000) {
    flags.push({
      code: 'LARGE_QTY_EA',
      message: `Count of ${item.quantity.toLocaleString()} EA is unusually high`,
      severity: 'warning',
    })
    score = Math.min(score, 0.50)
  }

  // Label quality
  if (!item.label || item.label.trim().length < 2) {
    flags.push({
      code: 'NO_LABEL',
      message: 'Item has no description label',
      severity: 'warning',
    })
    score = Math.min(score, 0.70)
  }

  // Geometry check
  if (!item.geometry) {
    flags.push({
      code: 'NO_GEOMETRY',
      message: 'No geometry recorded — item cannot be traced back to plan',
      severity: 'error',
    })
    score = Math.min(score, 0.15)
  }

  // Low base confidence from AI model
  if (score < CONFIDENCE_THRESHOLDS.LOW) {
    flags.push({
      code: 'LOW_CONFIDENCE',
      message: `AI confidence ${Math.round(score * 100)}% is below minimum threshold — manual review required`,
      severity: 'error',
    })
  } else if (score < CONFIDENCE_THRESHOLDS.MEDIUM) {
    flags.push({
      code: 'MEDIUM_CONFIDENCE',
      message: `AI confidence ${Math.round(score * 100)}% — review recommended`,
      severity: 'warning',
    })
  }

  const finalScore = Math.max(0, Math.min(1, score))
  const recommendation = getRecommendation(finalScore, flags)

  return {
    item_id: item.id ?? '',
    confidence_score: Math.round(finalScore * 100) / 100,
    flags,
    recommendation,
  }
}

/**
 * Validate a batch of items and return results + aggregate stats.
 */
export function validateBatch(items: Partial<TakeoffItem>[]): {
  results: ValidationResult[]
  summary: {
    total: number
    auto_approve_candidates: number
    needs_review: number
    needs_flagging: number
    avg_confidence: number
  }
} {
  const results = items.map(validateItem)

  const autoApprove = results.filter(r => r.recommendation === 'approve').length
  const needsReview = results.filter(r => r.recommendation === 'review').length
  const needsFlag = results.filter(r => r.recommendation === 'flag').length
  const avgConf =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length
      : 0

  return {
    results,
    summary: {
      total: results.length,
      auto_approve_candidates: autoApprove,
      needs_review: needsReview,
      needs_flagging: needsFlag,
      avg_confidence: Math.round(avgConf * 100) / 100,
    },
  }
}

/**
 * Compute aggregate QA summary from a list of items.
 * Used client-side without a DB call.
 */
export function computeQASummary(
  takeoffId: string,
  items: TakeoffItem[]
): TakeoffQASummary {
  const total = items.length
  let ai_detected = 0
  let pending_review = 0
  let approved = 0
  let flagged = 0
  let overridden = 0
  let confidenceSum = 0
  let lowConfidenceCount = 0

  for (const item of items) {
    switch (item.status) {
      case 'ai_detected':   ai_detected++;   break
      case 'pending_review': pending_review++; break
      case 'approved':      approved++;      break
      case 'flagged':       flagged++;       break
      case 'overridden':    overridden++;    break
    }
    confidenceSum += item.confidence ?? 0
    if ((item.confidence ?? 0) < CONFIDENCE_THRESHOLDS.MEDIUM) lowConfidenceCount++
  }

  const reviewed = approved + overridden
  const avgConfidence = total > 0 ? confidenceSum / total : 0
  const completionPct = total > 0 ? (reviewed / total) * 100 : 0

  return {
    takeoff_id: takeoffId,
    total_items: total,
    ai_detected,
    pending_review,
    approved,
    flagged,
    overridden,
    avg_confidence: Math.round(avgConfidence * 100) / 100,
    low_confidence_count: lowConfidenceCount,
    completion_pct: Math.round(completionPct * 10) / 10,
  }
}

/**
 * Get confidence tier label for display.
 */
export function getConfidenceTier(
  confidence: number
): 'high' | 'medium' | 'low' | 'reject' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH)   return 'high'
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium'
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW)    return 'low'
  return 'reject'
}

/**
 * Get CSS color class for confidence level (matches on-estimating design system).
 */
export function getConfidenceColor(confidence: number): string {
  const tier = getConfidenceTier(confidence)
  switch (tier) {
    case 'high':   return 'text-green-600 bg-green-50'
    case 'medium': return 'text-amber-600 bg-amber-50'
    case 'low':    return 'text-red-600 bg-red-50'
    case 'reject': return 'text-gray-500 bg-gray-100'
  }
}

/**
 * Format confidence as percentage string: 0.87 → "87%"
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

// ─── Internal helpers ────────────────────────────────────────

function getRecommendation(
  score: number,
  flags: ValidationFlag[]
): 'approve' | 'review' | 'flag' {
  const hasError = flags.some(f => f.severity === 'error')
  if (hasError) return 'flag'
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'approve'
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'review'
  return 'flag'
}
