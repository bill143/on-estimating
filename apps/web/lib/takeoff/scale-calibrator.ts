/**
 * Scale Calibrator Module
 * Provides scale calibration and pixel-to-real-world conversion for NEXUS ON Estimating
 * Supports architectural, engineering, and metric scales
 */

export interface Point {
  x: number;
  y: number;
}

export interface ScaleConfig {
  type: 'architectural' | 'engineering' | 'metric';
  scale: string; // e.g., "1/16" for architectural, "1:100" for metric
  pixelsPerUnit: number;
  unit: 'inch' | 'foot' | 'meter' | 'centimeter';
}

// Architectural scales (common in construction)
export const ARCH_SCALES = {
  '1/16': 0.0625,
  '1/8': 0.125,
  '1/4': 0.25,
  '3/8': 0.375,
  '1/2': 0.5,
  '3/4': 0.75,
  '1': 1,
  '1-1/2': 1.5,
  '3': 3,
};

// Engineering scales
export const ENG_SCALES = {
  '1"=10\'': 120,
  '1"=20\'': 240,
  '1"=30\'': 360,
  '1"=40\'': 480,
  '1"=50\'': 600,
  '1"=100\'': 1200,
};

// Metric scales
export const METRIC_SCALES = {
  '1:50': 50,
  '1:100': 100,
  '1:200': 200,
  '1:500': 500,
  '1:1000': 1000,
};
export class ScaleCalibrator {
  private config: ScaleConfig | null = null;
  private calibrationPoints: { pixel: Point; real: Point }[] = [];

  /**
   * Calibrate using two known points (one in pixels, one in real-world units)
   */
  calibrateFromTwoPoints(
    pixelPoint1: Point,
    realWorldPoint1: Point,
    pixelPoint2: Point,
    realWorldPoint2: Point,
    unit: 'inch' | 'foot' | 'meter' | 'centimeter' = 'foot'
  ): ScaleConfig {
    const pixelDistance = Math.sqrt(
      Math.pow(pixelPoint2.x - pixelPoint1.x, 2) +
        Math.pow(pixelPoint2.y - pixelPoint1.y, 2)
    );

    const realDistance = Math.sqrt(
      Math.pow(realWorldPoint2.x - realWorldPoint1.x, 2) +
        Math.pow(realWorldPoint2.y - realWorldPoint1.y, 2)
    );

    const pixelsPerUnit = pixelDistance / realDistance;

    this.config = {
      type: 'architectural',
      scale: 'custom',
      pixelsPerUnit,
      unit,
    };

    this.calibrationPoints = [
      { pixel: pixelPoint1, real: realWorldPoint1 },
      { pixel: pixelPoint2, real: realWorldPoint2 },
    ];

    return this.config;
  }

  /**
   * Calibrate using a preset scale
   */
  calibrateFromPreset(
    scaleType: 'architectural' | 'engineering' | 'metric',
    scale: string,
    pixelsPerUnit: number
  ): ScaleConfig {
    const unit =
      scaleType === 'architectural'
        ? 'inch'
        : scaleType === 'engineering'
          ? 'foot'
          : 'centimeter';

    this.config = {
      type: scaleType,
      scale,
      pixelsPerUnit,
      unit,
    };

    return this.config;
  }

  /**
   * Convert pixels to real-world units
   */
  pixelsToReal(pixels: number): number {
    if (!this.config) {
      throw new Error('Scale not calibrated');
    }
    return pixels / this.config.pixelsPerUnit;
  }

  /**
   * Convert real-world units to pixels
   */
  realToPixels(units: number): number {
    if (!this.config) {
      throw new Error('Scale not calibrated');
    }
    return units * this.config.pixelsPerUnit;
  }

  /**
   * Calculate pixel-based area
   */
  calculatePixelArea(width: number, height: number): number {
    return width * height;
  }

  /**
   * Calculate real-world area from pixel dimensions
   */
  calculateRealArea(pixelWidth: number, pixelHeight: number): number {
    if (!this.config) {
      throw new Error('Scale not calibrated');
    }
    const realWidth = this.pixelsToReal(pixelWidth);
    const realHeight = this.pixelsToReal(pixelHeight);
    return realWidth * realHeight;
  }

  /**
   * Calculate pixel distance between two points
   */
  calculatePixelDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Calculate real-world distance between two points
   */
  calculateRealDistance(p1: Point, p2: Point): number {
    const pixelDistance = this.calculatePixelDistance(p1, p2);
    return this.pixelsToReal(pixelDistance);
  }

  /**
   * Auto-detect scale from calibration points
   */
  autoDetectScale(): string | null {
    if (this.calibrationPoints.length < 2 || !this.config) {
      return null;
    }

    const pixelDist = this.calculatePixelDistance(
      this.calibrationPoints[0].pixel,
      this.calibrationPoints[1].pixel
    );
    const realDist = Math.sqrt(
      Math.pow(
        this.calibrationPoints[1].real.x - this.calibrationPoints[0].real.x,
        2
      ) +
        Math.pow(
          this.calibrationPoints[1].real.y - this.calibrationPoints[0].real.y,
          2
        )
    );

    const ratio = pixelDist / realDist;

    // Try to match against known scales
    if (this.config.type === 'architectural') {
      for (const [scale, value] of Object.entries(ARCH_SCALES)) {
        if (Math.abs(ratio - value) < 0.1) {
          return scale;
        }
      }
    } else if (this.config.type === 'engineering') {
      for (const [scale, value] of Object.entries(ENG_SCALES)) {
        if (Math.abs(ratio - value) < 10) {
          return scale;
        }
      }
    }

    return null;
  }

  /**
   * Get current calibration config
   */
  getConfig(): ScaleConfig | null {
    return this.config;
  }

  /**
   * Reset calibration
   */
  reset(): void {
    this.config = null;
    this.calibrationPoints = [];
  }
}
