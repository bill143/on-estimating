// ============================================================
// TAKEOFF MODULE — FORMULA ENGINE
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/takeoff/formula-engine.ts
// ============================================================

import type {
  CalculationInput,
  CalculationResult,
  ShapeGeometry,
  PolygonGeometry,
  PolylineGeometry,
  RectangleGeometry,
  CountGeometry,
  UnitType,
  MeasurementMode,
} from '@/types/takeoff.types'

// ─── Public API ───────────────────────────────────────────────

/**
 * Master calculation function.
 * Takes canvas geometry + scale calibration → real-world quantity.
 */
export function calculate(input: CalculationInput): CalculationResult {
  const { geometry, scale_ratio, mode, waste_factor_pct = 0 } = input

  if (scale_ratio <= 0) {
    throw new Error('Scale ratio must be greater than zero — calibrate the plan sheet first')
  }

  switch (mode) {
    case 'area':
      return calculateArea(geometry, scale_ratio, waste_factor_pct)
    case 'linear':
      return calculateLinear(geometry, scale_ratio, waste_factor_pct)
    case 'count':
      return calculateCount(geometry, waste_factor_pct)
    case 'volume':
      return calculateVolume(geometry, scale_ratio, waste_factor_pct)
    default:
      throw new Error(`Unknown measurement mode: ${mode}`)
  }
}

// ─── Area calculation ────────────────────────────────────────

function calculateArea(
  geometry: ShapeGeometry,
  scaleRatio: number,
  wastePct: number
): CalculationResult {
  let areaPx2 = 0
  let detail = ''

  if (geometry.type === 'polygon') {
    const poly = geometry as PolygonGeometry
    areaPx2 = poly.area_px2 > 0 ? poly.area_px2 : shoelaceArea(poly.points)
    detail = `Polygon with ${poly.points.length} vertices`
  } else if (geometry.type === 'rectangle') {
    const rect = geometry as RectangleGeometry
    areaPx2 = rect.area_px2 > 0 ? rect.area_px2 : rect.width * rect.height
    detail = `Rectangle ${round2(rect.width)}px × ${round2(rect.height)}px`
  } else {
    throw new Error(`Cannot calculate area for shape type: ${geometry.type}`)
  }

  const sqFt = areaPx2 / (scaleRatio * scaleRatio)
  const sqFtRounded = round2(sqFt)
  const withWaste = applyWaste(sqFtRounded, wastePct)

  return {
    raw_quantity: sqFtRounded,
    quantity_with_waste: withWaste,
    unit: 'SF',
    calculation_detail: `${detail} → ${sqFtRounded} SF${wastePct > 0 ? ` + ${wastePct}% waste = ${withWaste} SF` : ''}`,
  }
}

// ─── Linear calculation ──────────────────────────────────────

function calculateLinear(
  geometry: ShapeGeometry,
  scaleRatio: number,
  wastePct: number
): CalculationResult {
  let lengthPx = 0
  let detail = ''

  if (geometry.type === 'polyline') {
    const line = geometry as PolylineGeometry
    lengthPx = line.length_px > 0 ? line.length_px : totalPolylineLength(line.points)
    detail = `Polyline with ${line.points.length} points`
  } else if (geometry.type === 'rectangle') {
    const rect = geometry as RectangleGeometry
    lengthPx = 2 * (rect.width + rect.height)
    detail = 'Rectangle perimeter'
  } else if (geometry.type === 'polygon') {
    const poly = geometry as PolygonGeometry
    lengthPx = perimeterLength(poly.points)
    detail = `Polygon perimeter (${poly.points.length} vertices)`
  } else {
    throw new Error(`Cannot calculate linear length for shape type: ${geometry.type}`)
  }

  const lf = lengthPx / scaleRatio
  const lfRounded = round2(lf)
  const withWaste = applyWaste(lfRounded, wastePct)

  return {
    raw_quantity: lfRounded,
    quantity_with_waste: withWaste,
    unit: 'LF',
    calculation_detail: `${detail} → ${lfRounded} LF${wastePct > 0 ? ` + ${wastePct}% waste = ${withWaste} LF` : ''}`,
  }
}

// ─── Count calculation ───────────────────────────────────────

function calculateCount(
  geometry: ShapeGeometry,
  wastePct: number
): CalculationResult {
  let count = 0

  if (geometry.type === 'count') {
    const cnt = geometry as CountGeometry
    count = cnt.count > 0 ? cnt.count : cnt.points.length
  } else if (geometry.type === 'point') {
    count = 1
  } else {
    count = 1
  }

  const withWaste = Math.ceil(applyWaste(count, wastePct))

  return {
    raw_quantity: count,
    quantity_with_waste: withWaste,
    unit: 'EA',
    calculation_detail: `Count: ${count} EA${wastePct > 0 ? ` + ${wastePct}% waste = ${withWaste} EA` : ''}`,
  }
}

// ─── Volume calculation ──────────────────────────────────────

function calculateVolume(
  geometry: ShapeGeometry,
  scaleRatio: number,
  wastePct: number
): CalculationResult {
  // Volume requires depth — we calculate from area and ask caller to provide depth
  // For now: calculate plan area in SF and return as SF (caller multiplies by depth)
  const areaResult = calculateArea(geometry, scaleRatio, 0)
  const sqFt = areaResult.raw_quantity
  const cy = sqFt / 27  // assumes 1 foot depth as default; UI should multiply by depth
  const cyRounded = round2(cy)
  const withWaste = applyWaste(cyRounded, wastePct)

  return {
    raw_quantity: cyRounded,
    quantity_with_waste: withWaste,
    unit: 'CY',
    calculation_detail: `Area ${sqFt} SF ÷ 27 = ${cyRounded} CY (1-ft depth — multiply by actual depth)${wastePct > 0 ? ` + ${wastePct}% waste = ${withWaste} CY` : ''}`,
  }
}

// ─── Unit conversion helpers ─────────────────────────────────

/**
 * Convert square feet to another area unit.
 */
export function convertArea(sqFt: number, targetUnit: UnitType): number {
  switch (targetUnit) {
    case 'SF': return round4(sqFt)
    case 'SY': return round4(sqFt / 9)
    case 'CY': return round4(sqFt / 27)      // 1-ft depth assumed
    default:   return round4(sqFt)
  }
}

/**
 * Convert linear feet to another linear unit.
 */
export function convertLinear(lf: number, targetUnit: UnitType): number {
  switch (targetUnit) {
    case 'LF': return round4(lf)
    default:   return round4(lf)
  }
}

/**
 * Infer the best default unit for a given measurement mode + CSI division.
 */
export function inferDefaultUnit(
  mode: MeasurementMode,
  csiCode?: string
): UnitType {
  const div = csiCode ? parseInt(csiCode.slice(0, 2)) : 0

  if (mode === 'count') return 'EA'
  if (mode === 'volume') return 'CY'

  if (mode === 'area') {
    if (div === 7) return 'SF'    // Thermal & Moisture Protection
    if (div === 9) return 'SF'    // Finishes
    if (div === 3) return 'SF'    // Concrete formwork
    return 'SF'
  }

  if (mode === 'linear') {
    if (div === 5) return 'LF'    // Metals
    if (div === 6) return 'LF'    // Wood & Plastics
    if (div === 8) return 'LF'    // Openings (rough opening perimeter)
    if (div === 16 || div === 26) return 'LF'  // Electrical conduit
    return 'LF'
  }

  return 'EA'
}

/**
 * Apply waste factor to a quantity.
 * waste_pct: e.g. 10 = 10% → multiply by 1.10
 */
export function applyWaste(quantity: number, wastePct: number): number {
  if (wastePct <= 0) return quantity
  return round2(quantity * (1 + wastePct / 100))
}

// ─── Geometry helpers ────────────────────────────────────────

/**
 * Shoelace formula for polygon area in pixels².
 */
export function shoelaceArea(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 3) return 0

  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return Math.abs(area) / 2
}

/**
 * Total length of a polyline in pixels.
 */
export function totalPolylineLength(points: { x: number; y: number }[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  return total
}

/**
 * Perimeter of a closed polygon in pixels.
 */
export function perimeterLength(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 2) return 0
  let total = totalPolylineLength(points)
  // Close the polygon
  const dx = points[0].x - points[n - 1].x
  const dy = points[0].y - points[n - 1].y
  total += Math.sqrt(dx * dx + dy * dy)
  return total
}

// ─── Internal helpers ────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
