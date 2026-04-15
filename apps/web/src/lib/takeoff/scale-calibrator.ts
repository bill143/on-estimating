// ============================================================
// TAKEOFF MODULE — SCALE CALIBRATOR
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/takeoff/scale-calibrator.ts
// ============================================================

import type { ScaleCalibration, ParsedDimension } from '@/types/takeoff.types'
import { parseDimension } from './dimension-parser'

// ─── Common architectural scale strings ──────────────────────

const COMMON_SCALES: Record<string, number> = {
  '1/16"=1\'':    192,   // pixels per foot at 1:1 screen rendering
  '1/8"=1\'':     96,
  '3/16"=1\'':    64,
  '1/4"=1\'':     48,
  '3/8"=1\'':     32,
  '1/2"=1\'':     24,
  '3/4"=1\'':     16,
  '1"=1\'':       12,
  '1"=10\'':      1.2,
  '1"=20\'':      0.6,
  '1"=30\'':      0.4,
  '1"=40\'':      0.3,
  '1"=50\'':      0.24,
  '1"=100\'':     0.12,
  '1:10':         null as unknown as number,   // resolved at runtime
  '1:20':         null as unknown as number,
  '1:50':         null as unknown as number,
  '1:100':        null as unknown as number,
  '1:200':        null as unknown as number,
}

// Standard screen DPI assumption for PDF rendering
const SCREEN_DPI = 96

// ─── Public API ───────────────────────────────────────────────

/**
 * Calibrate scale from two canvas points defining a known reference length.
 *
 * @param pointA         First endpoint in canvas pixels {x, y}
 * @param pointB         Second endpoint in canvas pixels {x, y}
 * @param realWorldStr   Known real-world dimension string, e.g. "10'-0\""
 * @param userId         ID of the user performing calibration
 * @returns              ScaleCalibration object with pixels_per_foot
 */
export function calibrateFromPoints(
  pointA: { x: number; y: number },
  pointB: { x: number; y: number },
  realWorldStr: string,
  userId: string
): ScaleCalibration {
  const dx = pointB.x - pointA.x
  const dy = pointB.y - pointA.y
  const pixelLength = Math.sqrt(dx * dx + dy * dy)

  if (pixelLength < 5) {
    throw new Error('Reference line too short — draw a longer reference to improve accuracy')
  }

  const parsed = parseDimension(realWorldStr)
  if (parsed.value_feet <= 0) {
    throw new Error(`Could not parse real-world dimension: "${realWorldStr}"`)
  }

  const pixelsPerFoot = pixelLength / parsed.value_feet
  const scaleString = buildScaleString(pixelsPerFoot)

  return {
    reference_length_px: Math.round(pixelLength * 100) / 100,
    reference_length_real: parsed.value_feet,
    pixels_per_foot: Math.round(pixelsPerFoot * 1000) / 1000,
    scale_string: scaleString,
    calibrated_at: new Date().toISOString(),
    calibrated_by: userId,
  }
}

/**
 * Derive pixels_per_foot from a named scale string.
 * Works for common architectural scales like "1/4\"=1'-0\"".
 *
 * @param scaleStr   Scale string from title block
 * @param pdfDpi     DPI at which the PDF was rendered (default 96)
 */
export function calibrateFromScaleString(
  scaleStr: string,
  userId: string,
  pdfDpi: number = SCREEN_DPI
): ScaleCalibration | null {
  const normalized = normalizeScaleString(scaleStr)

  // Try direct lookup first
  if (COMMON_SCALES[normalized] !== undefined && COMMON_SCALES[normalized] !== null) {
    const pixelsPerFoot = COMMON_SCALES[normalized]
    return {
      reference_length_px: pixelsPerFoot,
      reference_length_real: 1,
      pixels_per_foot: pixelsPerFoot,
      scale_string: scaleStr,
      calibrated_at: new Date().toISOString(),
      calibrated_by: userId,
    }
  }

  // Try parsing "A:B" ratio format
  const ratioMatch = scaleStr.match(/^1\s*:\s*(\d+(?:\.\d+)?)$/)
  if (ratioMatch) {
    const ratio = parseFloat(ratioMatch[1])
    // At pdfDpi, 1 inch on paper = pdfDpi pixels.
    // 1 foot on plan at this scale = 12 paper inches * ratio screen pixels.
    const pixelsPerFoot = (pdfDpi * 12) / ratio
    return {
      reference_length_px: pixelsPerFoot,
      reference_length_real: 1,
      pixels_per_foot: Math.round(pixelsPerFoot * 1000) / 1000,
      scale_string: scaleStr,
      calibrated_at: new Date().toISOString(),
      calibrated_by: userId,
    }
  }

  // Try parsing "X"=Y'" format  (e.g. 1/4"=1')
  const inchFeetMatch = scaleStr.match(/^([\d./]+)"\s*=\s*(\d+)'$/)
  if (inchFeetMatch) {
    const paperInches = evalFraction(inchFeetMatch[1])
    const realFeet = parseFloat(inchFeetMatch[2])
    if (paperInches > 0 && realFeet > 0) {
      const pixelsPerPaperInch = pdfDpi
      const pixelsPerFoot = (pixelsPerPaperInch * paperInches) / realFeet
      return {
        reference_length_px: pixelsPerFoot,
        reference_length_real: 1,
        pixels_per_foot: Math.round(pixelsPerFoot * 1000) / 1000,
        scale_string: scaleStr,
        calibrated_at: new Date().toISOString(),
        calibrated_by: userId,
      }
    }
  }

  return null
}

/**
 * Convert a pixel distance to real-world feet given a calibration.
 */
export function pixelsToFeet(pixels: number, calibration: ScaleCalibration): number {
  if (calibration.pixels_per_foot <= 0) return 0
  return pixels / calibration.pixels_per_foot
}

/**
 * Convert a pixel area to real-world square feet given a calibration.
 */
export function pixelsToSquareFeet(
  areaPx2: number,
  calibration: ScaleCalibration
): number {
  if (calibration.pixels_per_foot <= 0) return 0
  return areaPx2 / (calibration.pixels_per_foot * calibration.pixels_per_foot)
}

/**
 * Validate a calibration — warn if ratio looks implausible.
 */
export function validateCalibration(calibration: ScaleCalibration): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (calibration.pixels_per_foot < 0.05) {
    warnings.push('Scale ratio is extremely small — verify your reference dimension')
  }
  if (calibration.pixels_per_foot > 5000) {
    warnings.push('Scale ratio is extremely large — verify your reference dimension')
  }
  if (calibration.reference_length_real < 0.1) {
    warnings.push('Reference dimension is less than 1.2 inches — use a longer reference for accuracy')
  }

  return { valid: warnings.length === 0, warnings }
}

// ─── Internal helpers ────────────────────────────────────────

function normalizeScaleString(input: string): string {
  return input.trim().replace(/\s+/g, '').replace(/'-0"/, "'").replace(/\s*=\s*/, '=')
}

function buildScaleString(pixelsPerFoot: number): string {
  // Find the closest common scale
  let closest = ''
  let closestDelta = Infinity

  for (const [key, pxft] of Object.entries(COMMON_SCALES)) {
    if (pxft === null) continue
    const delta = Math.abs(pxft - pixelsPerFoot)
    if (delta < closestDelta) {
      closestDelta = delta
      closest = key
    }
  }

  // If within 10% of a standard scale, label it; otherwise show ratio
  if (closestDelta / pixelsPerFoot < 0.1 && closest) {
    return closest
  }
  return `1"=${Math.round((SCREEN_DPI / pixelsPerFoot) * 12 * 10) / 10}'`
}

function evalFraction(str: string): number {
  if (str.includes('/')) {
    const [num, den] = str.split('/')
    return parseFloat(num) / parseFloat(den)
  }
  return parseFloat(str)
}
