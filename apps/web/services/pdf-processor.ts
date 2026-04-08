/**
 * PDF Processing Service
 * ----------------------
 * Handles the full pipeline for construction plan PDFs:
 *   1. Upload & validation
 *   2. Page extraction & thumbnail generation
 *   3. OCR text extraction (Tesseract.js)
 *   4. AI-assisted symbol/object detection (future)
 *   5. Scale calibration
 *
 * All processing states are tracked in the plan_pages table.
 */

import Decimal from 'decimal.js';

export interface PdfUploadResult {
  planSetId: string;
  totalPages: number;
  pages: PageExtractionResult[];
}

export interface PageExtractionResult {
  pageNumber: number;
  fileName: string;
  storagePath: string;
  thumbnailPath: string | null;
  width: number;
  height: number;
  dpi: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
  blocks: OcrBlock[];
}

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface ScaleCalibration {
  pixelsPerUnit: Decimal;
  unit: 'FT' | 'IN' | 'M' | 'CM';
  referenceLine: { x1: number; y1: number; x2: number; y2: number };
  referenceLength: Decimal;
}

// ---- Constants ----
export const PDF_LIMITS = {
  MAX_FILE_SIZE_MB: 100,
  MAX_PAGES: 500,
  SUPPORTED_TYPES: ['application/pdf'] as const,
  THUMBNAIL_WIDTH: 400,
  THUMBNAIL_QUALITY: 80,
} as const;

// ---- Validation ----
export function validatePdfUpload(file: File): { valid: boolean; error?: string } {
  if (!PDF_LIMITS.SUPPORTED_TYPES.includes(file.type as typeof PDF_LIMITS.SUPPORTED_TYPES[number])) {
    return { valid: false, error: 'Only PDF files are supported.' };
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > PDF_LIMITS.MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      error: `File size (${sizeMB.toFixed(1)} MB) exceeds the ${PDF_LIMITS.MAX_FILE_SIZE_MB} MB limit.`,
    };
  }

  return { valid: true };
}

// ---- Scale Measurement Helpers ----
export function calculateArea(
  points: Array<{ x: number; y: number }>,
  scale: ScaleCalibration
): Decimal {
  // Shoelace formula for polygon area in pixels, then convert via scale
  let pixelArea = new Decimal(0);
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pixelArea = pixelArea.plus(
      new Decimal(points[i].x).times(points[j].y)
    );
    pixelArea = pixelArea.minus(
      new Decimal(points[j].x).times(points[i].y)
    );
  }
  pixelArea = pixelArea.abs().dividedBy(2);

  const sqPixelsPerUnit = scale.pixelsPerUnit.pow(2);
  return pixelArea.dividedBy(sqPixelsPerUnit);
}

export function calculateLinearLength(
  points: Array<{ x: number; y: number }>,
  scale: ScaleCalibration
): Decimal {
  let totalPixels = new Decimal(0);
  for (let i = 0; i < points.length - 1; i++) {
    const dx = new Decimal(points[i + 1].x - points[i].x);
    const dy = new Decimal(points[i + 1].y - points[i].y);
    const dist = dx.pow(2).plus(dy.pow(2)).sqrt();
    totalPixels = totalPixels.plus(dist);
  }
  return totalPixels.dividedBy(scale.pixelsPerUnit);
}

export function countSymbols(
  detections: Array<{ label: string; confidence: number; bbox: object }>,
  targetLabel: string,
  minConfidence = 0.7
): number {
  return detections.filter(
    (d) => d.label === targetLabel && d.confidence >= minConfidence
  ).length;
}
