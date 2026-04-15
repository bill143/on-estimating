// ============================================================
// TAKEOFF MODULE — DYNAMIC LINKER (Symbol → CSI MasterFormat)
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/lib/takeoff/dynamic-linker.ts
// ============================================================

import type { CSILinkResult, AIDetectionResult, UnitType } from '@/types/takeoff.types'

// ─── CSI Lookup Table ────────────────────────────────────────
// Format: keyword[] → { code, description, unit }
// Keywords are lowercased. Longer/more specific entries listed first (priority order).

interface CSIEntry {
  code: string
  description: string
  unit: UnitType
  division: number
  keywords: string[]
}

const CSI_TABLE: CSIEntry[] = [
  // Division 03 — Concrete
  { code: '03 10 00', description: 'Concrete Forming and Accessories', unit: 'SF', division: 3, keywords: ['concrete form', 'formwork', 'form panels', 'shoring'] },
  { code: '03 20 00', description: 'Concrete Reinforcing', unit: 'LF', division: 3, keywords: ['rebar', 'reinforcing', 'steel bar', 'deformed bar', 'wwf', 'welded wire', 'mesh reinforcing'] },
  { code: '03 30 00', description: 'Cast-in-Place Concrete', unit: 'CY', division: 3, keywords: ['concrete', 'cast in place', 'slab', 'footing', 'grade beam', 'wall concrete', 'column concrete'] },
  { code: '03 41 00', description: 'Precast Concrete', unit: 'EA', division: 3, keywords: ['precast', 'prestressed', 'tee beam', 'hollow core'] },

  // Division 04 — Masonry
  { code: '04 20 00', description: 'Unit Masonry', unit: 'SF', division: 4, keywords: ['brick', 'block', 'cmu', 'masonry', 'concrete masonry unit', 'stone veneer', 'mortar', 'grout'] },

  // Division 05 — Metals
  { code: '05 12 00', description: 'Structural Steel Framing', unit: 'TON', division: 5, keywords: ['structural steel', 'wide flange', 'w-beam', 'steel column', 'steel beam', 'hss', 'tube steel'] },
  { code: '05 30 00', description: 'Steel Decking', unit: 'SF', division: 5, keywords: ['metal deck', 'steel deck', 'roof deck', 'composite deck', 'floor deck'] },
  { code: '05 50 00', description: 'Metal Fabrications', unit: 'LF', division: 5, keywords: ['handrail', 'guardrail', 'steel railing', 'ladder', 'metal grate', 'angle iron', 'steel lintel'] },

  // Division 06 — Wood, Plastics, and Composites
  { code: '06 10 00', description: 'Rough Carpentry', unit: 'LF', division: 6, keywords: ['framing', 'stud', 'joist', 'rafter', 'beam', 'lumber', 'wood framing', 'blocking', 'nailer', 'sill plate', 'top plate'] },
  { code: '06 20 00', description: 'Finish Carpentry', unit: 'LF', division: 6, keywords: ['trim', 'base molding', 'casing', 'chair rail', 'crown molding', 'wood paneling'] },
  { code: '06 40 00', description: 'Architectural Woodwork', unit: 'LF', division: 6, keywords: ['casework', 'cabinet', 'millwork', 'countertop', 'shelving'] },

  // Division 07 — Thermal and Moisture Protection
  { code: '07 10 00', description: 'Waterproofing', unit: 'SF', division: 7, keywords: ['waterproofing', 'membrane', 'below grade waterproof', 'damp proof'] },
  { code: '07 20 00', description: 'Thermal Protection (Insulation)', unit: 'SF', division: 7, keywords: ['insulation', 'batt', 'rigid insulation', 'spray foam', 'icynene', 'thermal barrier'] },
  { code: '07 30 00', description: 'Steep Slope Roofing', unit: 'SY', division: 7, keywords: ['shingle', 'tile roof', 'metal roof panel', 'standing seam'] },
  { code: '07 50 00', description: 'Membrane Roofing', unit: 'SY', division: 7, keywords: ['tpo', 'epdm', 'modified bitumen', 'built up roof', 'bur', 'flat roof membrane', 'roofing membrane'] },
  { code: '07 60 00', description: 'Flashing and Sheet Metal', unit: 'LF', division: 7, keywords: ['flashing', 'counter flashing', 'sheet metal', 'coping', 'gutter', 'downspout', 'drip edge'] },
  { code: '07 90 00', description: 'Joint Protection (Sealants)', unit: 'LF', division: 7, keywords: ['sealant', 'caulk', 'joint filler', 'expansion joint', 'backer rod'] },

  // Division 08 — Openings
  { code: '08 10 00', description: 'Doors and Frames', unit: 'EA', division: 8, keywords: ['door', 'hollow metal door', 'wood door', 'hm frame', 'door frame', 'entry door'] },
  { code: '08 30 00', description: 'Specialty Doors and Frames', unit: 'EA', division: 8, keywords: ['overhead door', 'roll up door', 'coiling door', 'sectional door', 'fire door', 'bi-fold door', 'sliding door'] },
  { code: '08 40 00', description: 'Entrances, Storefronts, and Curtain Walls', unit: 'SF', division: 8, keywords: ['storefront', 'curtain wall', 'glazed entrance', 'aluminum glazing', 'curtain glazing'] },
  { code: '08 50 00', description: 'Windows', unit: 'EA', division: 8, keywords: ['window', 'glazing unit', 'fixed window', 'operable window', 'casement', 'double hung', 'awning window'] },
  { code: '08 70 00', description: 'Hardware', unit: 'EA', division: 8, keywords: ['hardware', 'lockset', 'door closer', 'hinges', 'panic hardware', 'exit device', 'door stop'] },
  { code: '08 80 00', description: 'Glazing', unit: 'SF', division: 8, keywords: ['glass', 'glazing', 'insulated glass', 'tempered glass', 'laminated glass', 'safety glass'] },

  // Division 09 — Finishes
  { code: '09 20 00', description: 'Plaster and Gypsum Board', unit: 'SF', division: 9, keywords: ['drywall', 'gypsum board', 'gwr', 'sheetrock', 'plaster', 'wallboard', 'gypsum wallboard'] },
  { code: '09 30 00', description: 'Tiling', unit: 'SF', division: 9, keywords: ['tile', 'ceramic tile', 'porcelain tile', 'floor tile', 'wall tile', 'mosaic'] },
  { code: '09 51 00', description: 'Acoustical Ceilings', unit: 'SF', division: 9, keywords: ['acoustical ceiling', 'ceiling tile', 'suspended ceiling', 't-bar', 'drop ceiling', 'acoustic tile'] },
  { code: '09 60 00', description: 'Flooring', unit: 'SF', division: 9, keywords: ['flooring', 'lvt', 'vinyl', 'carpet', 'hardwood floor', 'laminate floor', 'epoxy floor', 'vct', 'rubber flooring'] },
  { code: '09 90 00', description: 'Paints and Coatings', unit: 'SF', division: 9, keywords: ['paint', 'coating', 'primer', 'epoxy coating', 'stain', 'varnish', 'wall paint', 'ceiling paint'] },

  // Division 10 — Specialties
  { code: '10 10 00', description: 'Visual Display Units', unit: 'EA', division: 10, keywords: ['whiteboard', 'chalkboard', 'tackboard', 'bulletin board', 'markerboard'] },
  { code: '10 21 00', description: 'Compartments and Cubicles', unit: 'EA', division: 10, keywords: ['toilet partition', 'bathroom partition', 'restroom partition', 'cubicle panel', 'locker'] },
  { code: '10 44 00', description: 'Fire Protection Specialties', unit: 'EA', division: 10, keywords: ['fire extinguisher', 'fire cabinet', 'hose cabinet', 'fire hydrant'] },

  // Division 21 — Fire Suppression
  { code: '21 10 00', description: 'Water-Based Fire-Suppression Systems', unit: 'EA', division: 21, keywords: ['sprinkler', 'fire sprinkler', 'fire suppression', 'standpipe', 'sprinkler head'] },

  // Division 22 — Plumbing
  { code: '22 00 00', description: 'Plumbing', unit: 'EA', division: 22, keywords: ['plumbing', 'plumbing fixture', 'sink', 'lavatory', 'toilet', 'water closet', 'urinal', 'shower', 'bathtub'] },
  { code: '22 10 00', description: 'Plumbing Piping', unit: 'LF', division: 22, keywords: ['plumbing pipe', 'drain pipe', 'waste line', 'supply line', 'pvc pipe', 'copper pipe', 'cast iron pipe'] },
  { code: '22 30 00', description: 'Plumbing Equipment', unit: 'EA', division: 22, keywords: ['water heater', 'booster pump', 'hot water', 'water softener', 'backflow preventer'] },

  // Division 23 — HVAC
  { code: '23 00 00', description: 'HVAC', unit: 'EA', division: 23, keywords: ['hvac', 'mechanical', 'air handler', 'ahu', 'rooftop unit', 'rtu', 'heat pump', 'chiller', 'boiler'] },
  { code: '23 05 93', description: 'Testing, Adjusting, and Balancing', unit: 'LS', division: 23, keywords: ['tab', 'balancing', 'test and balance', 'air balancing'] },
  { code: '23 30 00', description: 'HVAC Air Distribution', unit: 'LF', division: 23, keywords: ['ductwork', 'duct', 'supply duct', 'return duct', 'exhaust duct', 'flexible duct', 'diffuser', 'register', 'grille', 'vav', 'damper'] },

  // Division 26 — Electrical
  { code: '26 05 19', description: 'Low-Voltage Electrical Power Conductors', unit: 'LF', division: 26, keywords: ['wire', 'conductor', 'cable', 'electrical wire', 'branch circuit', 'thhn', 'romex'] },
  { code: '26 05 33', description: 'Raceway and Boxes', unit: 'LF', division: 26, keywords: ['conduit', 'emt', 'rigid conduit', 'pvc conduit', 'junction box', 'pull box', 'wireway'] },
  { code: '26 20 00', description: 'Low-Voltage Electrical Transmission', unit: 'EA', division: 26, keywords: ['panel', 'electrical panel', 'mcc', 'switchboard', 'switchgear', 'transformer', 'disconnect'] },
  { code: '26 51 00', description: 'Interior Lighting', unit: 'EA', division: 26, keywords: ['light fixture', 'luminaire', 'led', 'recessed light', 'fluorescent', 'linear light', 'pendant', 'downlight', 'exit sign', 'emergency light'] },
  { code: '26 56 00', description: 'Exterior Lighting', unit: 'EA', division: 26, keywords: ['exterior light', 'pole light', 'parking light', 'site light', 'wall pack', 'flood light'] },

  // Division 27 — Communications
  { code: '27 10 00', description: 'Structured Cabling', unit: 'LF', division: 27, keywords: ['data cable', 'cat6', 'cat5', 'network cable', 'structured cabling', 'fiber optic', 'comm cable'] },

  // Division 31 — Earthwork
  { code: '31 10 00', description: 'Site Clearing', unit: 'SF', division: 31, keywords: ['clearing', 'grubbing', 'site clearing', 'demolition vegetation', 'tree removal'] },
  { code: '31 20 00', description: 'Earth Moving', unit: 'CY', division: 31, keywords: ['excavation', 'grading', 'cut', 'fill', 'earthwork', 'backfill', 'mass excavation', 'rough grading'] },

  // Division 32 — Exterior Improvements
  { code: '32 10 00', description: 'Bases, Ballasts, and Paving', unit: 'SY', division: 32, keywords: ['paving', 'asphalt', 'concrete paving', 'parking lot', 'roadway', 'sidewalk', 'curb and gutter'] },
  { code: '32 90 00', description: 'Planting', unit: 'EA', division: 32, keywords: ['landscaping', 'planting', 'tree', 'shrub', 'sod', 'grass', 'lawn', 'mulch', 'planting bed'] },

  // Division 33 — Utilities
  { code: '33 10 00', description: 'Water Utilities', unit: 'LF', division: 33, keywords: ['water main', 'water line', 'waterline', 'fire main', 'domestic water', 'water service'] },
  { code: '33 30 00', description: 'Sanitary Sewerage Utilities', unit: 'LF', division: 33, keywords: ['sewer', 'sanitary sewer', 'storm sewer', 'drain', 'culvert', 'manhole'] },
]

// ─── Public API ───────────────────────────────────────────────

/**
 * Link a detected symbol description to the best-matching CSI code.
 *
 * @param symbolDescription   Raw label from AI detection or user input
 * @param suggestedCode       Optional code already suggested by AI model
 * @param existingCodes       CSI codes already in this project (boosts confidence)
 */
export function linkSymbolToCSI(
  symbolDescription: string,
  suggestedCode?: string,
  existingCodes: string[] = []
): CSILinkResult {
  const lower = symbolDescription.toLowerCase().trim()

  // 1. Exact match on AI-suggested code
  if (suggestedCode) {
    const normalized = normalizeCode(suggestedCode)
    const entry = CSI_TABLE.find(e => normalizeCode(e.code) === normalized)
    if (entry) {
      const confidence = existingCodes.includes(normalized) ? 0.97 : 0.90
      return buildResult(entry, confidence, 'exact')
    }
  }

  // 2. Keyword match — longest keyword match wins (most specific)
  let bestEntry: CSIEntry | null = null
  let bestKeywordLength = 0
  let bestMatch = ''

  for (const entry of CSI_TABLE) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw) && kw.length > bestKeywordLength) {
        bestKeywordLength = kw.length
        bestEntry = entry
        bestMatch = kw
      }
    }
  }

  if (bestEntry) {
    const isInProject = existingCodes.includes(normalizeCode(bestEntry.code))
    const confidence = isInProject
      ? Math.min(0.92, 0.75 + bestKeywordLength * 0.02)
      : Math.min(0.85, 0.65 + bestKeywordLength * 0.02)

    return buildResult(bestEntry, confidence, 'fuzzy')
  }

  // 3. Division guess from symbol description
  const divisionGuess = guessDivisionFromDescription(lower)
  if (divisionGuess) {
    return {
      csi_code: divisionGuess.code,
      csi_description: divisionGuess.description,
      division: divisionGuess.division,
      unit: divisionGuess.unit,
      confidence: 0.40,
      match_method: 'fuzzy',
    }
  }

  // 4. Fallback — unknown, needs manual assignment
  return {
    csi_code: '00 00 00',
    csi_description: 'Unclassified — Manual Assignment Required',
    division: 0,
    unit: 'EA',
    confidence: 0.10,
    match_method: 'fuzzy',
  }
}

/**
 * Batch link multiple AI detection results.
 */
export function batchLinkDetections(
  detections: AIDetectionResult[],
  existingCodes: string[] = []
): Array<AIDetectionResult & { csi_link: CSILinkResult }> {
  return detections.map(detection => ({
    ...detection,
    csi_link: linkSymbolToCSI(
      detection.symbol_description,
      detection.suggested_csi_code,
      existingCodes
    ),
  }))
}

/**
 * Get all entries for a specific CSI division.
 */
export function getCSIEntriesForDivision(division: number): CSIEntry[] {
  return CSI_TABLE.filter(e => e.division === division)
}

/**
 * Search CSI table by keyword.
 */
export function searchCSITable(query: string): CSIEntry[] {
  const lower = query.toLowerCase()
  return CSI_TABLE.filter(
    e =>
      e.description.toLowerCase().includes(lower) ||
      e.code.includes(lower) ||
      e.keywords.some(k => k.includes(lower))
  ).slice(0, 10)
}

// ─── Internal helpers ────────────────────────────────────────

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, ' ').trim()
}

function buildResult(
  entry: CSIEntry,
  confidence: number,
  method: CSILinkResult['match_method']
): CSILinkResult {
  return {
    csi_code: entry.code,
    csi_description: entry.description,
    division: entry.division,
    unit: entry.unit,
    confidence: Math.round(confidence * 100) / 100,
    match_method: method,
  }
}

function guessDivisionFromDescription(lower: string): CSIEntry | null {
  const divisionHints: Array<{ keywords: string[]; division: number }> = [
    { keywords: ['concrete', 'pour', 'slab'], division: 3 },
    { keywords: ['masonry', 'brick', 'block', 'stone'], division: 4 },
    { keywords: ['steel', 'metal', 'structural'], division: 5 },
    { keywords: ['wood', 'lumber', 'stud'], division: 6 },
    { keywords: ['roof', 'waterproof', 'insulation', 'membrane'], division: 7 },
    { keywords: ['door', 'window', 'glass', 'opening'], division: 8 },
    { keywords: ['finish', 'drywall', 'paint', 'floor', 'ceiling'], division: 9 },
    { keywords: ['mechanical', 'hvac', 'duct', 'fan', 'vent'], division: 23 },
    { keywords: ['electrical', 'panel', 'conduit', 'light', 'outlet'], division: 26 },
    { keywords: ['plumbing', 'pipe', 'fixture', 'drain'], division: 22 },
    { keywords: ['site', 'grading', 'paving', 'excavation'], division: 31 },
  ]

  for (const hint of divisionHints) {
    if (hint.keywords.some(k => lower.includes(k))) {
      const divEntries = CSI_TABLE.filter(e => e.division === hint.division)
      if (divEntries.length > 0) return divEntries[0]
    }
  }

  return null
}
