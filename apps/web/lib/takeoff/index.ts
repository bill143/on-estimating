/**
 * NEXUS ON Estimating - Takeoff Module
 * Phase 1: AI Takeoff Engine - Complete Barrel Exports
 */

// Re-export from scale-calibrator
export type { Point, ScaleConfig } from './scale-calibrator';
export {
  ARCH_SCALES,
  ENG_SCALES,
  METRIC_SCALES,
  ScaleCalibrator,
} from './scale-calibrator';

// Re-export from dimension-parser
export type {
  ParsedDimension,
  ParsedArea,
  ParsedVolume,
} from './dimension-parser';
export {
  parseDimension,
  parseArea,
  parseVolume,
  parseDimensionAuto,
} from './dimension-parser';
// Re-export from formula-engine
export type { FormulaValidation, FormulaResult } from './formula-engine';
export { FormulaEngine } from './formula-engine';

// Re-export from plan-upload
export type {
  PlanMetadata,
  PageInfo,
  UploadResult,
  PlanFile,
} from './plan-upload';
export { PlanUploadService } from './plan-upload';

// Re-export from ai-vision-extraction
export type {
  ElementType,
  Discipline,
  BoundingBox,
  DetectedElement,
  DimensionExtraction,
  ScaleDetection,
  ExtractionResult,
  ProjectContext,
  ExtractionType,
  BatchExtractionTask,
  BatchExtractionResult,
} from './ai-vision-extraction';
export { AIVisionExtractionService } from './ai-vision-extraction';
// Re-export from validation-engine
export type {
  ValidationContext,
  ValidationResult,
  ValidationReport,
  ValidationFlag,
  ValidationItem,
  ConsensusResult,
  AIValidationResult,
  GeometricValidationResult,
  HistoricalValidationResult,
  GeometricData,
} from './validation-engine';
export {
  ValidationEngine,
  ValidationMethod,
  ValidationFlagType,
  FlagSeverity,
  INDUSTRY_BENCHMARKS,
} from './validation-engine';

// Re-export from dynamic-linker
export type {
  DependencyNode,
  DynamicLink,
  CascadeUpdate,
  DependencyGraph,
  LinkValidationError,
} from './dynamic-linker';
export { DynamicLinker, LinkType, LinkStatus } from './dynamic-linker';