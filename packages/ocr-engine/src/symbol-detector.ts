// @on/ocr-engine — Construction symbol detection from deep pass elements

import type {
  DeepPassResult,
  DetectedSymbol,
  ConstructionSymbolType,
  BoundingBox,
} from './types';
import { clampConfidence } from './confidence';

// Symbol classification patterns based on element type and content keywords
const SYMBOL_PATTERNS: Array<{
  type: ConstructionSymbolType;
  keywords: string[];
  elementTypes: string[];
}> = [
  {
    type: 'door',
    keywords: ['door', 'dr', 'hm', 'hollow metal', 'wd', 'wood door', 'sliding', 'swing'],
    elementTypes: ['symbol', 'annotation', 'block'],
  },
  {
    type: 'window',
    keywords: ['window', 'wn', 'win', 'glazing', 'storefront', 'curtainwall', 'curtain wall'],
    elementTypes: ['symbol', 'annotation', 'block'],
  },
  {
    type: 'column',
    keywords: ['column', 'col', 'pier', 'pilaster'],
    elementTypes: ['symbol', 'structural', 'block'],
  },
  {
    type: 'electrical_fixture',
    keywords: [
      'light', 'luminaire', 'fixture', 'receptacle', 'outlet', 'switch',
      'panel', 'junction', 'transformer', 'led', 'recessed',
    ],
    elementTypes: ['symbol', 'electrical', 'block', 'annotation'],
  },
  {
    type: 'plumbing_fixture',
    keywords: [
      'sink', 'lavatory', 'lav', 'toilet', 'wc', 'water closet', 'urinal',
      'shower', 'floor drain', 'cleanout', 'hose bib', 'drinking fountain',
    ],
    elementTypes: ['symbol', 'plumbing', 'block', 'annotation'],
  },
  {
    type: 'sprinkler_head',
    keywords: ['sprinkler', 'spk', 'fire sprinkler', 'pendant', 'upright', 'sidewall'],
    elementTypes: ['symbol', 'fire_protection', 'block'],
  },
  {
    type: 'fire_alarm',
    keywords: [
      'fire alarm', 'pull station', 'smoke detector', 'heat detector',
      'horn', 'strobe', 'annunciator', 'facp',
    ],
    elementTypes: ['symbol', 'fire_protection', 'block'],
  },
  {
    type: 'mechanical_equipment',
    keywords: [
      'ahu', 'rtu', 'vav', 'fan coil', 'exhaust fan', 'diffuser',
      'grille', 'register', 'damper', 'thermostat', 'unit heater',
    ],
    elementTypes: ['symbol', 'mechanical', 'block', 'annotation'],
  },
  {
    type: 'structural_member',
    keywords: ['beam', 'girder', 'joist', 'truss', 'brace', 'footing', 'foundation'],
    elementTypes: ['symbol', 'structural', 'block'],
  },
];

/**
 * Detect construction symbols from deep pass element data.
 * Classifies elements into standard construction symbol types and aggregates counts.
 */
export function detectConstructionSymbols(
  deepResult: DeepPassResult
): DetectedSymbol[] {
  const symbolMap = new Map<string, DetectedSymbol>();

  for (const element of deepResult.elements) {
    const contentLower = element.content.toLowerCase();
    const typeLower = element.type.toLowerCase();

    let matched = false;

    for (const pattern of SYMBOL_PATTERNS) {
      const keywordMatch = pattern.keywords.some((kw) => contentLower.includes(kw));
      const typeMatch = pattern.elementTypes.some((et) => typeLower.includes(et));

      if (keywordMatch || (typeMatch && keywordMatch)) {
        const key = `${pattern.type}:${element.content.trim().substring(0, 50)}`;

        const existing = symbolMap.get(key);
        if (existing) {
          existing.count += 1;
          existing.confidence = Math.max(existing.confidence, clampConfidence(element.confidence));
          expandBbox(existing.bbox, element.bbox);
        } else {
          symbolMap.set(key, {
            type: pattern.type,
            label: element.content.trim(),
            bbox: { ...element.bbox },
            count: 1,
            confidence: clampConfidence(element.confidence),
            attributes: { ...element.attributes },
          });
        }
        matched = true;
        break;
      }
    }

    // Unmatched elements with high confidence still get recorded as generic
    if (!matched && element.confidence >= 0.6) {
      const key = `generic:${element.content.trim().substring(0, 50)}`;
      const existing = symbolMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        symbolMap.set(key, {
          type: 'generic',
          label: element.content.trim(),
          bbox: { ...element.bbox },
          count: 1,
          confidence: clampConfidence(element.confidence),
          attributes: { ...element.attributes },
        });
      }
    }
  }

  return Array.from(symbolMap.values());
}

/**
 * Expand a bounding box to encompass another bounding box.
 */
function expandBbox(target: BoundingBox, addition: BoundingBox): void {
  const minX = Math.min(target.x, addition.x);
  const minY = Math.min(target.y, addition.y);
  const maxX = Math.max(target.x + target.width, addition.x + addition.width);
  const maxY = Math.max(target.y + target.height, addition.y + addition.height);
  target.x = minX;
  target.y = minY;
  target.width = maxX - minX;
  target.height = maxY - minY;
}
