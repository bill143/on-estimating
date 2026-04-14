// @on/ocr-engine — QA threshold and confidence logic

const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;

/**
 * Determine whether an OCR-detected item passes the confidence threshold.
 * Items below the threshold are flagged for manual QA review.
 */
export function meetsThreshold(
  confidence: number,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): boolean {
  return confidence >= threshold;
}

/**
 * Compute an aggregate confidence score from multiple stage scores.
 * Uses weighted geometric mean — stages with higher weight contribute more.
 */
export function aggregateConfidence(
  scores: Array<{ value: number; weight: number }>
): number {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;

  let logSum = 0;
  for (const s of scores) {
    const clamped = Math.max(0.001, Math.min(1, s.value));
    logSum += (s.weight / totalWeight) * Math.log(clamped);
  }

  return Math.exp(logSum);
}

/**
 * Determine the QA status for a takeoff item based on its confidence.
 */
export function resolveStatus(
  confidence: number,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): 'pending' | 'flagged' {
  return meetsThreshold(confidence, threshold) ? 'pending' : 'flagged';
}

/**
 * Clamp a confidence score to the valid [0, 1] range.
 */
export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
