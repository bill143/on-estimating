// ============================================================
// TAKEOFF MODULE — DIMENSION PARSER
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/takeoff/dimension-parser.ts
// ============================================================

import type { ParsedDimension } from '@/types/takeoff.types'

// ─── Public API ───────────────────────────────────────────────

/**
 * Parse any architectural dimension string into decimal feet.
 *
 * Handles:
 *   "10'"            → 10.0 ft
 *   "6\""            → 0.5 ft
 *   "3'-6\""         → 3.5 ft
 *   "3'6\""          → 3.5 ft
 *   "10'-0\""        → 10.0 ft
 *   "1/4\"=1'-0\""   → parsed as paper scale, returns 1.0 ft (real side)
 *   "2500mm"         → 8.202 ft
 *   "2.5m"           → 8.202 ft
 *   "30cm"           → 0.984 ft
 *   "36"             → 36.0 ft (assumed feet when no unit)
 *   "36in"           → 3.0 ft
 */
export function parseDimension(input: string): ParsedDimension {
  const trimmed = input.trim()

  // Scale string — extract the real-world side (right of "=")
  if (trimmed.includes('=')) {
    const parts = trimmed.split('=')
    const realSide = parts[parts.length - 1].trim()
    return parseDimension(realSide)
  }

  // Metric: millimetres
  const mmMatch = trimmed.match(/^([\d.,]+)\s*mm$/i)
  if (mmMatch) {
    const mm = parseFloat(mmMatch[1].replace(',', ''))
    return { value_feet: round4(mm / 304.8), original_string: input, unit_detected: 'metric' }
  }

  // Metric: centimetres
  const cmMatch = trimmed.match(/^([\d.,]+)\s*cm$/i)
  if (cmMatch) {
    const cm = parseFloat(cmMatch[1].replace(',', ''))
    return { value_feet: round4(cm / 30.48), original_string: input, unit_detected: 'metric' }
  }

  // Metric: metres
  const mMatch = trimmed.match(/^([\d.,]+)\s*m$/i)
  if (mMatch) {
    const m = parseFloat(mMatch[1].replace(',', ''))
    return { value_feet: round4(m / 0.3048), original_string: input, unit_detected: 'metric' }
  }

  // Feet + inches: "3'-6"", "3'6"", "3' 6"", "3'- 6""
  const feetInchesMatch = trimmed.match(/^(\d+)'\s*-?\s*([\d./ ]+)"?$/)
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1])
    const inchStr = feetInchesMatch[2].trim()
    const inches = evalFraction(inchStr)
    return { value_feet: round4(feet + inches / 12), original_string: input, unit_detected: 'feet' }
  }

  // Feet only: "10'" or "10'-0""
  const feetOnlyMatch = trimmed.match(/^([\d.]+)'\s*(?:-?\s*0")?$/)
  if (feetOnlyMatch) {
    return { value_feet: round4(parseFloat(feetOnlyMatch[1])), original_string: input, unit_detected: 'feet' }
  }

  // Fractional feet: "3 1/2'"
  const fracFeetMatch = trimmed.match(/^(\d+)\s+(\d+\/\d+)'$/)
  if (fracFeetMatch) {
    const whole = parseFloat(fracFeetMatch[1])
    const frac = evalFraction(fracFeetMatch[2])
    return { value_feet: round4(whole + frac), original_string: input, unit_detected: 'feet' }
  }

  // Inches only with unit: "36in" or "36 inches"
  const inchesMatch = trimmed.match(/^([\d./ ]+)\s*(?:in|inch|inches|")$/i)
  if (inchesMatch) {
    const inches = evalFraction(inchesMatch[1].trim())
    return { value_feet: round4(inches / 12), original_string: input, unit_detected: 'inches' }
  }

  // Bare fraction: "1/4", "3/8" (assume feet)
  const bareFracMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (bareFracMatch) {
    const value = parseInt(bareFracMatch[1]) / parseInt(bareFracMatch[2])
    return { value_feet: round4(value), original_string: input, unit_detected: 'feet' }
  }

  // Plain number: assume feet
  const plainMatch = trimmed.match(/^([\d.]+)$/)
  if (plainMatch) {
    return { value_feet: round4(parseFloat(plainMatch[1])), original_string: input, unit_detected: 'feet' }
  }

  // Could not parse
  return { value_feet: 0, original_string: input, unit_detected: 'feet' }
}

/**
 * Parse a scale string like "1/4\"=1'-0\"" into paper-to-real ratio.
 * Returns { paperValue, realValue } both in feet.
 */
export function parseScaleRatio(scaleStr: string): {
  paper_feet: number
  real_feet: number
  ratio: number        // real / paper
} | null {
  const parts = scaleStr.split('=')
  if (parts.length !== 2) return null

  const paper = parseDimension(parts[0].trim())
  const real = parseDimension(parts[1].trim())

  if (paper.value_feet <= 0 || real.value_feet <= 0) return null

  return {
    paper_feet: paper.value_feet,
    real_feet: real.value_feet,
    ratio: real.value_feet / paper.value_feet,
  }
}

/**
 * Format decimal feet into architectural notation.
 * 3.5 → "3'-6\""
 * 10.0 → "10'-0\""
 */
export function formatFeetToArchitectural(decimalFeet: number): string {
  const feet = Math.floor(decimalFeet)
  const inches = Math.round((decimalFeet - feet) * 12)
  if (inches === 12) return `${feet + 1}'-0"`
  return `${feet}'-${inches}"`
}

/**
 * Format decimal feet into a compact display string.
 * 3.5 → "3.50 ft"
 * 150.25 → "150.25 ft"
 */
export function formatFeet(decimalFeet: number): string {
  return `${decimalFeet.toFixed(2)} ft`
}

// ─── Internal helpers ────────────────────────────────────────

function evalFraction(str: string): number {
  const trimmed = str.trim()
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    if (parts.length === 2) {
      return parseFloat(parts[0]) / parseFloat(parts[1])
    }
  }
  return parseFloat(trimmed) || 0
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
