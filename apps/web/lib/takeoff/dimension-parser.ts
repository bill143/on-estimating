/**
 * Dimension Parser Module
 * Parses construction dimensions with support for architectural, engineering, and metric notation
 * Handles feet-inches, fractions, decimals, and metric units
 */

export interface ParsedDimension {
  value: number;
  unit: 'inch' | 'foot' | 'yard' | 'meter' | 'centimeter' | 'millimeter';
  original: string;
  parts?: {
    feet?: number;
    inches?: number;
    fractionNumerator?: number;
    fractionDenominator?: number;
    decimal?: number;
  };
}

export interface ParsedArea {
  value: number;
  unit:
    | 'sqft'
    | 'sqinch'
    | 'sqyard'
    | 'sqmeter'
    | 'sqcentimeter'
    | 'sqmillimeter';
  original: string;
  width?: number;
  height?: number;
}

export interface ParsedVolume {
  value: number;
  unit:
    | 'cubicft'
    | 'cubicinch'
    | 'cubicyard'
    | 'cubicmeter'
    | 'cubiccm'
    | 'cubicmm';
  original: string;
  width?: number;
  height?: number;
  depth?: number;
}

// Unit conversion factors (to inches and cubic inches)
const INCH_TO_MM = 25.4;
const INCH_TO_CM = 2.54;
const INCH_TO_METER = 0.0254;
const FOOT_TO_INCH = 12;
const YARD_TO_INCH = 36;

/**
 * Normalize unit names to standard format
 */
function normalizeUnitName(unit: string): string {
  const normalized = unit.toLowerCase().trim();

  const unitMap: Record<string, string> = {
    inch: 'inch',
    in: 'inch',
    '"': 'inch',
    foot: 'foot',
    ft: 'foot',
    "'": 'foot',
    yard: 'yard',
    yd: 'yard',
    meter: 'meter',
    m: 'meter',
    centimeter: 'centimeter',
    cm: 'centimeter',
    millimeter: 'millimeter',
    mm: 'millimeter',
  };

  return unitMap[normalized] || normalized;
}

/**
 * Convert between units (returns value in target unit)
 */
function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const from = normalizeUnitName(fromUnit);
  const to = normalizeUnitName(toUnit);

  // Convert to inches first
  let inches = value;
  switch (from) {
    case 'foot':
      inches = value * FOOT_TO_INCH;
      break;
    case 'yard':
      inches = value * YARD_TO_INCH;
      break;
    case 'centimeter':
      inches = value / INCH_TO_CM;
      break;
    case 'millimeter':
      inches = value / INCH_TO_MM;
      break;
    case 'meter':
      inches = value / INCH_TO_METER;
      break;
  }

  // Convert from inches to target unit
  switch (to) {
    case 'foot':
      return inches / FOOT_TO_INCH;
    case 'yard':
      return inches / YARD_TO_INCH;
    case 'centimeter':
      return inches * INCH_TO_CM;
    case 'millimeter':
      return inches * INCH_TO_MM;
    case 'meter':
      return inches * INCH_TO_METER;
    default:
      return inches;
  }
}

/**
 * Parse architectural notation: 12'-6 3/8"
 */
function parseArchitecturalNotation(input: string): ParsedDimension | null {
  const archPattern =
    /^(\d+)\s*'[\s]?(\d+)\s*([0-9]*)\s*\/\s*([0-9]+)\s*"?$/;
  const match = input.match(archPattern);

  if (!match) return null;

  const feet = parseInt(match[1], 10);
  const inches = parseInt(match[2], 10);
  const numerator = match[3] ? parseInt(match[3], 10) : 0;
  const denominator = parseInt(match[4], 10);

  let totalInches = feet * FOOT_TO_INCH + inches;
  if (numerator && denominator) {
    totalInches += numerator / denominator;
  }

  return {
    value: totalInches,
    unit: 'inch',
    original: input,
    parts: { feet, inches, fractionNumerator: numerator, fractionDenominator: denominator },
  };
}

/**
 * Parse decimal notation: 12.5 ft or 318mm
 */
function parseDecimalNotation(input: string): ParsedDimension | null {
  const decimalPattern = /^([\d.]+)\s*(ft|in|mm|cm|m|yd)?$/i;
  const match = input.match(decimalPattern);

  if (!match) return null;

  const value = parseFloat(match[1]);
  let unit = match[2] ? normalizeUnitName(match[2]) : 'inch';

  return {
    value,
    unit: unit as
      | 'inch'
      | 'foot'
      | 'yard'
      | 'meter'
      | 'centimeter'
      | 'millimeter',
    original: input,
    parts: { decimal: value },
  };
}

/**
 * Parse fraction notation: 3/8"
 */
function parseFractionNotation(input: string): ParsedDimension | null {
  const fractionPattern = /^(\d+)\s*\/\s*(\d+)\s*"?$/;
  const match = input.match(fractionPattern);

  if (!match) return null;

  const numerator = parseInt(match[1], 10);
  const denominator = parseInt(match[2], 10);
  const value = numerator / denominator;

  return {
    value,
    unit: 'inch',
    original: input,
    parts: { fractionNumerator: numerator, fractionDenominator: denominator },
  };
}

/**
 * Parse dimension string in various formats
 */
export function parseDimension(input: string): ParsedDimension | null {
  const trimmed = input.trim();

  // Try architectural notation first (12'-6 3/8")
  let result = parseArchitecturalNotation(trimmed);
  if (result) return result;

  // Try fraction notation (3/8")
  result = parseFractionNotation(trimmed);
  if (result) return result;

  // Try decimal notation (12.5 ft, 318mm)
  result = parseDecimalNotation(trimmed);
  if (result) return result;

  return null;
}

/**
 * Parse area dimension (width x height)
 */
export function parseArea(
  input: string,
  defaultUnit: 'sqft' | 'sqmeter' = 'sqft'
): ParsedArea | null {
  const areaPattern =
    /^([\d\s'"\/-]+)\s*x\s*([\d\s'"\/-]+)\s*(sqft|sqm|sq\.ft|sq\.m)?$/i;
  const match = input.match(areaPattern);

  if (!match) return null;

  const widthParsed = parseDimension(match[1]);
  const heightParsed = parseDimension(match[2]);

  if (!widthParsed || !heightParsed) return null;

  // Convert both to feet for area calculation
  const widthFeet = convertUnit(widthParsed.value, widthParsed.unit, 'foot');
  const heightFeet = convertUnit(heightParsed.value, heightParsed.unit, 'foot');
  const areaValue = widthFeet * heightFeet;

  const unitStr = match[3] ? match[3].toLowerCase() : defaultUnit;
  let unit: 'sqft' | 'sqmeter' = 'sqft';

  if (unitStr.includes('m')) {
    unit = 'sqmeter';
  }

  return {
    value: unit === 'sqmeter' ? convertUnit(areaValue, 'sqft', 'sqmeter') : areaValue,
    unit,
    original: input,
    width: widthFeet,
    height: heightFeet,
  };
}

/**
 * Parse volume dimension (width x height x depth)
 */
export function parseVolume(
  input: string,
  defaultUnit: 'cubicft' | 'cubicmeter' = 'cubicft'
): ParsedVolume | null {
  const volumePattern =
    /^([\d\s'"\/-]+)\s*x\s*([\d\s'"\/-]+)\s*x\s*([\d\s'"\/-]+)\s*(cubicft|cubicm|cu\.ft|cu\.m)?$/i;
  const match = input.match(volumePattern);

  if (!match) return null;

  const widthParsed = parseDimension(match[1]);
  const heightParsed = parseDimension(match[2]);
  const depthParsed = parseDimension(match[3]);

  if (!widthParsed || !heightParsed || !depthParsed) return null;

  // Convert all to feet for volume calculation
  const widthFeet = convertUnit(widthParsed.value, widthParsed.unit, 'foot');
  const heightFeet = convertUnit(heightParsed.value, heightParsed.unit, 'foot');
  const depthFeet = convertUnit(depthParsed.value, depthParsed.unit, 'foot');
  const volumeValue = widthFeet * heightFeet * depthFeet;

  const unitStr = match[4] ? match[4].toLowerCase() : defaultUnit;
  let unit: 'cubicft' | 'cubicmeter' = 'cubicft';

  if (unitStr.includes('m')) {
    unit = 'cubicmeter';
  }

  return {
    value: unit === 'cubicmeter' ? convertUnit(volumeValue, 'cubicft', 'cubicmeter') : volumeValue,
    unit,
    original: input,
    width: widthFeet,
    height: heightFeet,
    depth: depthFeet,
  };
}

/**
 * Parse generic dimension with automatic unit detection
 */
export function parseDimensionAuto(input: string): {
  value: number;
  unit: string;
  normalized: ParsedDimension | null;
} | null {
  const parsed = parseDimension(input);

  if (!parsed) {
    return null;
  }

  return {
    value: parsed.value,
    unit: parsed.unit,
    normalized: parsed,
  };
}
