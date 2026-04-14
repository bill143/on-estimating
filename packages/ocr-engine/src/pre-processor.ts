// @on/ocr-engine — Pre-processor: title block isolation, resolution normalization, orientation correction

import type { PreProcessedSheet, BoundingBox } from './types';

const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const DEFAULT_DPI = 150;

// Title blocks are typically in the bottom-right quadrant of architectural sheets
const TITLE_BLOCK_REGION: BoundingBox = {
  x: 0.65,  // normalized: right 35% of sheet
  y: 0.75,  // normalized: bottom 25% of sheet
  width: 0.35,
  height: 0.25,
};

/**
 * Pre-process a plan sheet image/PDF page before OCR.
 * - Isolates the title block region using morphological bounds
 * - Normalizes resolution to 1080p for consistent model input
 * - Detects and corrects orientation (landscape vs portrait)
 *
 * The actual image manipulation is done server-side by the Python gateway.
 * This function computes the metadata and parameters to send.
 */
export function preProcess(
  fileUrl: string,
  opts?: {
    width?: number;
    height?: number;
    dpi?: number;
  }
): PreProcessedSheet {
  const origWidth = opts?.width ?? 3400;  // typical arch D-size at 150 DPI
  const origHeight = opts?.height ?? 2200;
  const dpi = opts?.dpi ?? DEFAULT_DPI;

  // Detect orientation — construction plans are almost always landscape
  const isLandscape = origWidth >= origHeight;
  const orientationCorrected = !isLandscape;

  // After orientation correction, effective dimensions
  const effectiveWidth = isLandscape ? origWidth : origHeight;
  const effectiveHeight = isLandscape ? origHeight : origWidth;

  // Compute scale factor to normalize to target resolution
  const scaleX = TARGET_WIDTH / effectiveWidth;
  const scaleY = TARGET_HEIGHT / effectiveHeight;
  const scale = Math.min(scaleX, scaleY);

  const normalizedWidth = Math.round(effectiveWidth * scale);
  const normalizedHeight = Math.round(effectiveHeight * scale);

  // Title block bounds in pixel coordinates (after normalization)
  const titleBlockBounds: BoundingBox = {
    x: Math.round(TITLE_BLOCK_REGION.x * normalizedWidth),
    y: Math.round(TITLE_BLOCK_REGION.y * normalizedHeight),
    width: Math.round(TITLE_BLOCK_REGION.width * normalizedWidth),
    height: Math.round(TITLE_BLOCK_REGION.height * normalizedHeight),
  };

  // Content area is everything outside the title block
  const contentBounds: BoundingBox = {
    x: 0,
    y: 0,
    width: normalizedWidth,
    height: Math.round(TITLE_BLOCK_REGION.y * normalizedHeight),
  };

  return {
    normalizedUrl: fileUrl,
    titleBlockBounds,
    contentBounds,
    originalWidth: origWidth,
    originalHeight: origHeight,
    normalizedWidth,
    normalizedHeight,
    orientationCorrected,
    dpi,
  };
}
