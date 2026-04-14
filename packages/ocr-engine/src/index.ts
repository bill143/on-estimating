// @on/ocr-engine — Public API exports

export { processPlanSheet } from './pipeline';
export { preProcess } from './pre-processor';
export { runFastPass } from './fast-pass';
export { runDeepPass } from './deep-pass';
export { extractTables } from './table-extractor';
export { detectConstructionSymbols } from './symbol-detector';
export { mapToCSI, mapSymbolsToCSI, mapKeynotesToCSI } from './csi-mapper';
export { writeTakeoffItems } from './db-writer';
export {
  meetsThreshold,
  aggregateConfidence,
  resolveStatus,
  clampConfidence,
} from './confidence';

export type {
  ProcessPlanSheetOpts,
  OcrResult,
  PreProcessedSheet,
  BoundingBox,
  FastPassResult,
  LayoutBlock,
  DeepPassResult,
  DeepElement,
  Keynote,
  ExtractedTable,
  ConstructionSymbolType,
  DetectedSymbol,
  ParsedDimensionResult,
  CsiMappedItem,
  TakeoffItemRow,
  WriteResult,
  GatewayFastPassRequest,
  GatewayFastPassResponse,
  GatewayDeepPassRequest,
  GatewayDeepPassResponse,
  GatewayExtractTablesRequest,
  GatewayExtractTablesResponse,
  GatewayHealthResponse,
} from './types';
