// @on/ocr-engine — Type definitions for the dual-engine OCR pipeline

// ─── Pipeline Input / Output ─────────────────────────────────────────────────

export interface ProcessPlanSheetOpts {
  fastPassOnly?: boolean;
  confidenceThreshold?: number;
}

export interface OcrResult {
  planSheetId: string;
  fastPass: FastPassResult;
  deepPass: DeepPassResult | null;
  tables: ExtractedTable[];
  symbols: DetectedSymbol[];
  dimensions: ParsedDimensionResult[];
  csiMapped: CsiMappedItem[];
  itemsWritten: number;
  itemsFlagged: number;
  totalLatencyMs: number;
}

// ─── Pre-Processor ───────────────────────────────────────────────────────────

export interface PreProcessedSheet {
  normalizedUrl: string;
  titleBlockBounds: BoundingBox | null;
  contentBounds: BoundingBox;
  originalWidth: number;
  originalHeight: number;
  normalizedWidth: number;
  normalizedHeight: number;
  orientationCorrected: boolean;
  dpi: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Fast Pass (Marker + Surya) ──────────────────────────────────────────────

export interface FastPassResult {
  text: string;
  layout: LayoutBlock[];
  readingOrder: number[];
  pageCount: number;
  latencyMs: number;
}

export interface LayoutBlock {
  id: number;
  type: 'text' | 'title' | 'table' | 'figure' | 'list' | 'header' | 'footer';
  bbox: BoundingBox;
  content: string;
  confidence: number;
}

// ─── Deep Pass (MinerU + PaddleOCR-VL) ───────────────────────────────────────

export interface DeepPassResult {
  text: string;
  elements: DeepElement[];
  keynotes: Keynote[];
  confidenceMap: Record<string, number>;
  latencyMs: number;
}

export interface DeepElement {
  id: string;
  type: string;
  content: string;
  bbox: BoundingBox;
  confidence: number;
  attributes: Record<string, unknown>;
}

export interface Keynote {
  id: string;
  code: string;
  description: string;
  location: BoundingBox;
  confidence: number;
}

// ─── Table Extraction (Docling TableFormer) ──────────────────────────────────

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  coordinates: BoundingBox;
  tableType: 'schedule' | 'legend' | 'keynote' | 'material' | 'general';
  confidence: number;
}

// ─── Symbol Detection ────────────────────────────────────────────────────────

export type ConstructionSymbolType =
  | 'door'
  | 'window'
  | 'column'
  | 'electrical_fixture'
  | 'plumbing_fixture'
  | 'sprinkler_head'
  | 'fire_alarm'
  | 'mechanical_equipment'
  | 'structural_member'
  | 'generic';

export interface DetectedSymbol {
  type: ConstructionSymbolType;
  label: string;
  bbox: BoundingBox;
  count: number;
  confidence: number;
  attributes: Record<string, unknown>;
}

// ─── Dimension Parsing ───────────────────────────────────────────────────────

export interface ParsedDimensionResult {
  original: string;
  valueFeet: number;
  valueInches: number;
  unit: string;
  isScale: boolean;
  scaleString?: string;
}

// ─── CSI Mapping ─────────────────────────────────────────────────────────────

export interface CsiMappedItem {
  symbolType: ConstructionSymbolType | 'dimension' | 'keynote';
  label: string;
  csiCode: string;
  csiDescription: string;
  quantity: number;
  unit: string;
  shapeType: 'count' | 'polygon' | 'line';
  geometry: BoundingBox;
  confidence: number;
  sourceStage: 'fast_pass' | 'deep_pass' | 'table_extract' | 'symbol_detect';
}

// ─── DB Writer ───────────────────────────────────────────────────────────────

export interface TakeoffItemRow {
  id: string;
  takeoff_id: string;
  plan_page_id: string;
  shape_type: string;
  geometry: Record<string, unknown>;
  quantity: number;
  unit: string;
  csi_code: string;
  label: string;
  confidence: number;
  status: 'pending' | 'flagged';
  source_stage: string;
  created_by: string;
  created_at: string;
}

export interface WriteResult {
  inserted: number;
  flagged: number;
  errors: string[];
}

// ─── Gateway API Shapes ──────────────────────────────────────────────────────

export interface GatewayFastPassRequest {
  file_url: string;
  sheet_id: string;
}

export interface GatewayFastPassResponse {
  text: string;
  layout: LayoutBlock[];
  reading_order: number[];
  page_count: number;
}

export interface GatewayDeepPassRequest {
  file_url: string;
  sheet_id: string;
}

export interface GatewayDeepPassResponse {
  text: string;
  elements: DeepElement[];
  keynotes: Keynote[];
  confidence_map: Record<string, number>;
}

export interface GatewayExtractTablesRequest {
  file_url: string;
  sheet_id: string;
}

export interface GatewayExtractTablesResponse {
  tables: ExtractedTable[];
}

export interface GatewayHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  models_loaded: string[];
}
