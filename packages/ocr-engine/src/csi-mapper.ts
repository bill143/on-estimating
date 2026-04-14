// @on/ocr-engine — CSI MasterFormat division code mapping
// Maps detected symbols and keynotes to CSI codes for takeoff_items

import type {
  DetectedSymbol,
  Keynote,
  CsiMappedItem,
  ConstructionSymbolType,
} from './types';
import { clampConfidence } from './confidence';

// CSI MasterFormat 2016 — common division mappings for construction symbols
const SYMBOL_TO_CSI: Record<ConstructionSymbolType, { code: string; description: string; unit: string }> = {
  door: { code: '08 10 00', description: 'Doors and Frames', unit: 'EA' },
  window: { code: '08 50 00', description: 'Windows', unit: 'EA' },
  column: { code: '03 30 00', description: 'Cast-in-Place Concrete', unit: 'EA' },
  electrical_fixture: { code: '26 51 00', description: 'Interior Lighting', unit: 'EA' },
  plumbing_fixture: { code: '22 40 00', description: 'Plumbing Fixtures', unit: 'EA' },
  sprinkler_head: { code: '21 13 00', description: 'Fire-Suppression Sprinkler Systems', unit: 'EA' },
  fire_alarm: { code: '28 31 00', description: 'Fire Detection and Alarm', unit: 'EA' },
  mechanical_equipment: { code: '23 00 00', description: 'HVAC', unit: 'EA' },
  structural_member: { code: '05 12 00', description: 'Structural Steel Framing', unit: 'EA' },
  generic: { code: '01 00 00', description: 'General Requirements', unit: 'EA' },
};

// Keynote code prefix to CSI division mapping
const KEYNOTE_PREFIX_TO_CSI: Array<{ prefix: string; code: string; description: string }> = [
  { prefix: 'A', code: '09 00 00', description: 'Finishes' },
  { prefix: 'S', code: '05 00 00', description: 'Metals' },
  { prefix: 'M', code: '23 00 00', description: 'HVAC' },
  { prefix: 'P', code: '22 00 00', description: 'Plumbing' },
  { prefix: 'E', code: '26 00 00', description: 'Electrical' },
  { prefix: 'FP', code: '21 00 00', description: 'Fire Suppression' },
  { prefix: 'L', code: '32 00 00', description: 'Exterior Improvements' },
  { prefix: 'C', code: '31 00 00', description: 'Earthwork' },
];

/**
 * Derive the shape_type for a takeoff item based on the symbol type.
 */
function deriveShapeType(symbolType: ConstructionSymbolType): 'count' | 'polygon' | 'line' {
  switch (symbolType) {
    case 'door':
    case 'window':
    case 'column':
    case 'electrical_fixture':
    case 'plumbing_fixture':
    case 'sprinkler_head':
    case 'fire_alarm':
    case 'mechanical_equipment':
    case 'generic':
      return 'count';
    case 'structural_member':
      return 'line';
    default:
      return 'count';
  }
}

/**
 * Map detected construction symbols to CSI MasterFormat division codes.
 */
export function mapSymbolsToCSI(symbols: DetectedSymbol[]): CsiMappedItem[] {
  return symbols.map((symbol) => {
    const csi = SYMBOL_TO_CSI[symbol.type] ?? SYMBOL_TO_CSI.generic;

    return {
      symbolType: symbol.type,
      label: symbol.label || `${symbol.type} (detected)`,
      csiCode: csi.code,
      csiDescription: csi.description,
      quantity: symbol.count,
      unit: csi.unit,
      shapeType: deriveShapeType(symbol.type),
      geometry: symbol.bbox,
      confidence: clampConfidence(symbol.confidence),
      sourceStage: 'symbol_detect' as const,
    };
  });
}

/**
 * Map keynotes extracted from deep pass to CSI codes.
 */
export function mapKeynotesToCSI(keynotes: Keynote[]): CsiMappedItem[] {
  return keynotes.map((keynote) => {
    const code = keynote.code.trim().toUpperCase();

    let csiCode = '01 00 00';
    let csiDescription = 'General Requirements';

    for (const mapping of KEYNOTE_PREFIX_TO_CSI) {
      if (code.startsWith(mapping.prefix)) {
        csiCode = mapping.code;
        csiDescription = mapping.description;
        break;
      }
    }

    // If the keynote code itself looks like a CSI code (e.g., "03 30 00"), use it directly
    const csiPattern = /^(\d{2})\s*(\d{2})\s*(\d{2})$/;
    const csiMatch = code.match(csiPattern);
    if (csiMatch) {
      csiCode = `${csiMatch[1]} ${csiMatch[2]} ${csiMatch[3]}`;
      csiDescription = keynote.description;
    }

    return {
      symbolType: 'keynote' as const,
      label: keynote.description || keynote.code,
      csiCode,
      csiDescription,
      quantity: 1,
      unit: 'EA',
      shapeType: 'count' as const,
      geometry: keynote.location,
      confidence: clampConfidence(keynote.confidence),
      sourceStage: 'deep_pass' as const,
    };
  });
}

/**
 * Combined mapping: symbols + keynotes -> CSI-mapped items
 */
export function mapToCSI(
  symbols: DetectedSymbol[],
  keynotes: Keynote[]
): CsiMappedItem[] {
  const symbolItems = mapSymbolsToCSI(symbols);
  const keynoteItems = mapKeynotesToCSI(keynotes);
  return [...symbolItems, ...keynoteItems];
}
