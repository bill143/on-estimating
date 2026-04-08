import Anthropic from '@anthropic-ai/sdk';

export enum ValidationMethod {
  AI_PRIMARY = 'AI_PRIMARY',
  AI_SECONDARY = 'AI_SECONDARY',
  GEOMETRIC = 'GEOMETRIC',
  HISTORICAL = 'HISTORICAL'
}

export enum ValidationFlagType {
  QUANTITY_DISCREPANCY = 'quantity_discrepancy',
  LOW_CONFIDENCE = 'low_confidence',
  OUTLIER = 'outlier',
  INSUFFICIENT_DATA = 'insufficient_data',
  METHOD_CONFLICT = 'method_conflict'
}

export enum FlagSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ValidationContext {
  itemId: string;
  itemType: string;
  quantity: number;
  unit: string;
  planArea?: number;
  planPerimeter?: number;
  materialType?: string;
  subType?: string;
  specification?: string;
  metadata?: Record<string, unknown>;
}

export interface GeometricData {
  area?: number;
  perimeter?: number;
  height?: number;
  width?: number;
  depth?: number;
  quantity?: number;
  wasteFactor: number;
  notes?: string;
}

export interface AIValidationResult {
  method: ValidationMethod;
  quantity: number;
  confidence: number;
  reasoning: string;
  flagged: boolean;
  flagReason?: string;
}

export interface GeometricValidationResult {
  method: ValidationMethod;
  quantity: number;
  confidence: number;
  calculation: string;
  wasteFactor: number;
  baseQuantity: number;
}

export interface HistoricalValidationResult {
  method: ValidationMethod;
  quantity: number;
  confidence: number;
  benchmarkMin: number;
  benchmarkMax: number;
  benchmarkAvg: number;
  percentageOfAvg: number;
}

export interface ValidationFlag {
  type: ValidationFlagType;
  severity: FlagSeverity;
  description: string;
  affectedMethods: ValidationMethod[];
  suggestedAction: string;
}

export interface ValidationResult {
  itemId: string;
  consensus: ConsensusResult;
  methodResults: (AIValidationResult | GeometricValidationResult | HistoricalValidationResult)[];
  flags: ValidationFlag[];
  timestamp: string;
  validationStatus: 'approved' | 'flagged' | 'requires_review';
}

export interface ValidationItem {
  itemId: string;
  itemType: string;
  quantity: number;
  unit: string;
  planArea?: number;
  planPerimeter?: number;
  materialType?: string;
  subType?: string;
  specification?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsensusResult {
  quantity: number;
  confidence: number;
  variance: number;
  methodWeights: Record<ValidationMethod, number>;
}

export interface ValidationReport {
  reportId: string;
  timestamp: string;
  totalItems: number;
  validItems: number;
  flaggedItems: number;
  requiresReviewItems: number;
  overallConfidence: number;
  results: ValidationResult[];
  summary: string;
}

/** Industry benchmarks: [min, max] per unit area or perimeter */
export const INDUSTRY_BENCHMARKS: Record<string, Record<string, [number, number]>> = {
  concrete: {
    foundations: [3.5, 4.5],
    slabs: [3.0, 4.0],
    footings: [2.5, 3.5]
  },
  rebar: {
    standard: [0.668, 0.748],
    epoxy_coated: [0.748, 0.828],
    stainless: [1.5, 2.0]
  },
  drywall: {
    standard_12mm: [10.0, 12.5],
    fire_rated_12mm: [11.0, 13.5],
    moisture_resistant_12mm: [11.5, 14.0]
  },
  insulation: {
    fiberglass_r13: [0.9, 1.1],
    fiberglass_r19: [1.2, 1.5],
    spray_foam: [1.5, 2.0]
  },
  framing: {
    wood_stud_2x4: [0.5, 0.7],
    wood_stud_2x6: [0.7, 0.9],
    steel_stud: [1.5, 2.0]
  },
  roofing: {
    asphalt_shingles: [1.0, 1.2],
    metal_panels: [0.8, 1.0],
    flat_membrane: [1.1, 1.3]
  },
  flooring: {
    plywood_subfloor: [1.1, 1.3],
    hardwood: [1.0, 1.2],
    tile: [1.15, 1.35]
  },
  painting: {
    interior_wall: [0.35, 0.45],
    exterior_wall: [0.25, 0.35],
    trim: [0.15, 0.25]
  },
  doors: {
    standard_entry: [1.0, 1.2],
    patio: [1.5, 2.0],
    interior_passage: [0.8, 1.0]
  }
};

/**
 * 4-Way Validation Engine
 * Cross-validates takeoff quantities using AI Primary, AI Secondary, Geometric, and Historical methods.
 * Produces weighted consensus with confidence scoring and actionable flags.
 */
export class ValidationEngine {
  private validationHistory: Map<string, ValidationResult[]> = new Map();
  private anthropicClient: Anthropic;
  private readonly METHOD_WEIGHTS = {
    [ValidationMethod.AI_PRIMARY]: 0.35,
    [ValidationMethod.AI_SECONDARY]: 0.25,
    [ValidationMethod.GEOMETRIC]: 0.25,
    [ValidationMethod.HISTORICAL]: 0.15
  };

  constructor() {
    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /** Main validation — runs all 4 methods and produces consensus */
  async validateQuantity(context: ValidationContext): Promise<ValidationResult> {
    const results: (AIValidationResult | GeometricValidationResult | HistoricalValidationResult)[] = [];

    const [aiPrimary, aiSecondary, geometric, historical] = await Promise.all([
      this.runAIPrimary(context),
      this.runAISecondary(context),
      this.runGeometricValidation(context),
      this.runHistoricalValidation(context)
    ]);

    results.push(aiPrimary, aiSecondary, geometric, historical);

    const consensus = this.calculateConsensus(results);
    const flags = this.generateFlags(results, consensus, context);
    const validationStatus = this.determineStatus(flags, consensus.confidence);

    const validationResult: ValidationResult = {
      itemId: context.itemId,
      consensus,
      methodResults: results,
      flags,
      timestamp: new Date().toISOString(),
      validationStatus
    };

    this.recordValidation(validationResult);
    return validationResult;
  }

  /** Batch validate multiple items */
  async batchValidate(items: ValidationItem[]): Promise<ValidationReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: ValidationResult[] = [];

    for (const item of items) {
      const context: ValidationContext = {
        itemId: item.itemId,
        itemType: item.itemType,
        quantity: item.quantity,
        unit: item.unit,
        planArea: item.planArea,
        planPerimeter: item.planPerimeter,
        materialType: item.materialType,
        subType: item.subType,
        specification: item.specification,
        metadata: item.metadata
      };

      const result = await this.validateQuantity(context);
      results.push(result);
    }

    const validItems = results.filter(r => r.validationStatus === 'approved').length;
    const flaggedItems = results.filter(r => r.validationStatus === 'flagged').length;
    const requiresReviewItems = results.filter(r => r.validationStatus === 'requires_review').length;
    const overallConfidence = results.reduce((sum, r) => sum + r.consensus.confidence, 0) / results.length;

    return {
      reportId,
      timestamp: new Date().toISOString(),
      totalItems: items.length,
      validItems,
      flaggedItems,
      requiresReviewItems,
      overallConfidence,
      results,
      summary: `Validation complete: ${validItems} approved, ${flaggedItems} flagged, ${requiresReviewItems} require review. Overall confidence: ${(overallConfidence * 100).toFixed(1)}%`
    };
  }

  /** Get validation history for an item */
  getValidationHistory(itemId: string): ValidationResult[] {
    return this.validationHistory.get(itemId) || [];
  }

  /** AI Primary validation using Claude API */
  private async runAIPrimary(context: ValidationContext): Promise<AIValidationResult> {
    try {
      const prompt = `You are an expert construction estimator. Validate this takeoff quantity:
Item: ${context.itemType} (${context.materialType || 'standard'})
Spec: ${context.specification || 'Standard'}
Quantity: ${context.quantity} ${context.unit}
Plan Area: ${context.planArea || 'N/A'} sq ft
Perimeter: ${context.planPerimeter || 'N/A'} ft

Provide: confidence (0-1), adjusted quantity, reasoning, any concerns.`;

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const confidenceMatch = responseText.match(/confidence[:\s]+([0-9.]+)/i);
      const quantityMatch = responseText.match(/(?:adjusted\s+)?quantity[:\s]+([0-9.]+)/i);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;
      const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : context.quantity;
      const flagged = confidence < 0.6 || responseText.toLowerCase().includes('concern');

      return {
        method: ValidationMethod.AI_PRIMARY,
        quantity,
        confidence: Math.min(confidence, 1),
        reasoning: responseText.substring(0, 200),
        flagged,
        flagReason: flagged ? 'AI Primary confidence below threshold or concerns identified' : undefined
      };
    } catch (error) {
      console.error('AI Primary validation failed:', error);
      return {
        method: ValidationMethod.AI_PRIMARY,
        quantity: context.quantity,
        confidence: 0.3,
        reasoning: 'API call failed, using submitted quantity',
        flagged: true,
        flagReason: 'API error during validation'
      };
    }
  }

  /** AI Secondary validation — independent verification */
  private async runAISecondary(context: ValidationContext): Promise<AIValidationResult> {
    try {
      const prompt = `As an independent construction cost analyst, verify this takeoff without knowing the primary estimate:
Item: ${context.itemType} (${context.materialType || 'standard'})
Specs: ${context.specification || 'Standard installation'}
Plan Dimensions: ${context.planArea ? context.planArea + ' sq ft' : 'Area not specified'}

Estimate what quantity of ${context.unit} would be needed. Provide confidence (0-1) and reasoning.`;

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const confidenceMatch = responseText.match(/confidence[:\s]+([0-9.]+)/i);
      const quantityMatch = responseText.match(/(?:quantity|estimate)[:\s]+([0-9.]+)/i);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.65;
      const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : context.quantity;
      const flagged = confidence < 0.5;

      return {
        method: ValidationMethod.AI_SECONDARY,
        quantity,
        confidence: Math.min(confidence, 1),
        reasoning: responseText.substring(0, 200),
        flagged,
        flagReason: flagged ? 'Secondary validation confidence below threshold' : undefined
      };
    } catch (error) {
      console.error('AI Secondary validation failed:', error);
      return {
        method: ValidationMethod.AI_SECONDARY,
        quantity: context.quantity,
        confidence: 0.3,
        reasoning: 'API call failed',
        flagged: true,
        flagReason: 'API error during secondary validation'
      };
    }
  }

  /** Geometric validation — pure mathematical calculations */
  private runGeometricValidation(context: ValidationContext): GeometricValidationResult {
    let calculatedQuantity = context.quantity;
    let baseQuantity = context.quantity;
    let wasteFactor = 1.0;
    let calculation = 'No geometric calculation applied';
    let confidence = 0.6;

    if (context.planArea) {
      if (['drywall', 'flooring', 'insulation', 'roofing'].includes(context.materialType || '')) {
        baseQuantity = context.planArea / 32;
        wasteFactor = 1.15;
        calculatedQuantity = baseQuantity * wasteFactor;
        calculation = `Area ${context.planArea} sq ft / 32 sq ft/sheet x ${wasteFactor} waste = ${calculatedQuantity.toFixed(2)}`;
        confidence = 0.8;
      }
    }

    if (context.planPerimeter) {
      if (['doors', 'windows', 'framing'].includes(context.materialType || '')) {
        const spacing = context.materialType === 'doors' ? 3 : 1.33;
        baseQuantity = context.planPerimeter / spacing;
        wasteFactor = 1.1;
        calculatedQuantity = baseQuantity * wasteFactor;
        calculation = `Perimeter ${context.planPerimeter} ft / ${spacing} spacing x ${wasteFactor} waste = ${calculatedQuantity.toFixed(2)}`;
        confidence = 0.75;
      }
    }

    const variance = Math.abs(calculatedQuantity - context.quantity) / Math.max(calculatedQuantity, context.quantity);
    if (variance > 0.2) confidence -= 0.15;

    return {
      method: ValidationMethod.GEOMETRIC,
      quantity: calculatedQuantity,
      confidence: Math.max(confidence, 0.3),
      calculation,
      wasteFactor,
      baseQuantity
    };
  }

  /** Historical benchmark validation */
  private runHistoricalValidation(context: ValidationContext): HistoricalValidationResult {
    const benchmarks = INDUSTRY_BENCHMARKS[context.materialType || '']?.[context.subType || 'standard'] || [0.8, 1.2];
    const benchmarkMin = benchmarks[0];
    const benchmarkMax = benchmarks[1];
    const benchmarkAvg = (benchmarkMin + benchmarkMax) / 2;

    let historicalQuantity = context.quantity;
    let confidence = 0.7;

    if (context.planArea && context.materialType === 'concrete') {
      historicalQuantity = context.planArea * benchmarkAvg;
      confidence = 0.8;
    } else if (context.planPerimeter && ['framing', 'doors'].includes(context.materialType || '')) {
      historicalQuantity = context.planPerimeter * benchmarkAvg;
      confidence = 0.75;
    }

    const percentageOfAvg = (context.quantity / benchmarkAvg) * 100;
    if (percentageOfAvg < 50 || percentageOfAvg > 150) confidence -= 0.2;

    return {
      method: ValidationMethod.HISTORICAL,
      quantity: historicalQuantity,
      confidence,
      benchmarkMin,
      benchmarkMax,
      benchmarkAvg,
      percentageOfAvg
    };
  }

  /** Calculate weighted consensus from all methods */
  private calculateConsensus(results: (AIValidationResult | GeometricValidationResult | HistoricalValidationResult)[]): ConsensusResult {
    let totalWeightedQuantity = 0;
    let totalWeightedConfidence = 0;
    let totalWeight = 0;
    const methodWeights: Record<ValidationMethod, number> = { ...this.METHOD_WEIGHTS } as Record<ValidationMethod, number>;

    for (const result of results) {
      const weight = this.METHOD_WEIGHTS[result.method];
      totalWeightedQuantity += result.quantity * weight;
      totalWeightedConfidence += result.confidence * weight;
      totalWeight += weight;
    }

    const consensusQuantity = totalWeight > 0 ? totalWeightedQuantity / totalWeight : 0;
    const consensusConfidence = totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;

    const variance = Math.sqrt(
      results.reduce((sum, r) => sum + Math.pow(r.quantity - consensusQuantity, 2), 0) / results.length
    );

    return { quantity: consensusQuantity, confidence: consensusConfidence, variance, methodWeights };
  }

  /** Generate validation flags */
  private generateFlags(
    results: (AIValidationResult | GeometricValidationResult | HistoricalValidationResult)[],
    consensus: ConsensusResult,
    _context: ValidationContext
  ): ValidationFlag[] {
    const flags: ValidationFlag[] = [];

    const discrepancies = results.filter(r => Math.abs(r.quantity - consensus.quantity) > consensus.variance * 2);
    if (discrepancies.length > 0) {
      flags.push({
        type: ValidationFlagType.QUANTITY_DISCREPANCY,
        severity: FlagSeverity.WARNING,
        description: `${discrepancies.length} method(s) show significant variance from consensus`,
        affectedMethods: discrepancies.map(d => d.method),
        suggestedAction: 'Review differing methods for accuracy'
      });
    }

    if (consensus.confidence < 0.6) {
      flags.push({
        type: ValidationFlagType.LOW_CONFIDENCE,
        severity: FlagSeverity.WARNING,
        description: `Overall confidence ${(consensus.confidence * 100).toFixed(0)}% below threshold`,
        affectedMethods: results.map(r => r.method),
        suggestedAction: 'Manual review recommended'
      });
    }

    const outliers = results.filter(r => r.quantity > consensus.quantity * 1.3 || r.quantity < consensus.quantity * 0.7);
    if (outliers.length > 0) {
      flags.push({
        type: ValidationFlagType.OUTLIER,
        severity: FlagSeverity.INFO,
        description: `${outliers.length} method(s) appear to be outliers`,
        affectedMethods: outliers.map(o => o.method),
        suggestedAction: 'Verify calculation methods'
      });
    }

    const flaggedAI = results.filter(r => 'flagged' in r && (r as AIValidationResult).flagged);
    if (flaggedAI.length > 0) {
      flags.push({
        type: ValidationFlagType.METHOD_CONFLICT,
        severity: FlagSeverity.WARNING,
        description: 'AI validation methods flagged concerns',
        affectedMethods: flaggedAI.map(f => f.method),
        suggestedAction: (flaggedAI[0] as AIValidationResult)?.flagReason || 'Review AI reasoning'
      });
    }

    return flags;
  }

  private determineStatus(flags: ValidationFlag[], confidence: number): 'approved' | 'flagged' | 'requires_review' {
    const criticalFlags = flags.filter(f => f.severity === FlagSeverity.CRITICAL || f.severity === FlagSeverity.ERROR);
    const warningFlags = flags.filter(f => f.severity === FlagSeverity.WARNING);

    if (criticalFlags.length > 0 || confidence < 0.5) return 'requires_review';
    if (warningFlags.length > 0 || confidence < 0.7) return 'flagged';
    return 'approved';
  }

  private recordValidation(result: ValidationResult): void {
    const history = this.validationHistory.get(result.itemId) || [];
    history.push(result);
    this.validationHistory.set(result.itemId, history);
  }
}
