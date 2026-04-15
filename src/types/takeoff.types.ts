// ============================================================
// TAKEOFF MODULE — COMPLETE TYPE SYSTEM
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/types/takeoff.types.ts
// ============================================================

// ─── Enumerations ───────────────────────────────────────────

export type ShapeType = 'polygon' | 'polyline' | 'rectangle' | 'count' | 'point'

export type MeasurementMode = 'area' | 'linear' | 'count' | 'volume'

export type TakeoffItemStatus =
  | 'ai_detected'
  | 'pending_review'
  | 'approved'
  | 'flagged'
  | 'overridden'

export type PlanSheetStatus = 'uploading' | 'processing' | 'ready' | 'error'

export type TakeoffStatus = 'draft' | 'in_progress' | 'qa_review' | 'complete'

export type UnitType =
  | 'SF'   // square feet
  | 'SY'   // square yards
  | 'LF'   // linear feet
  | 'EA'   // each / count
  | 'CY'   // cubic yards
  | 'CF'   // cubic feet
  | 'TON'
  | 'LB'
  | 'GAL'
  | 'LS'   // lump sum

// ─── Core Entities ──────────────────────────────────────────

export interface PlanSet {
  id: string
  project_id: string
  name: string
  version: string
  uploaded_by: string
  uploaded_at: string
  sheet_count: number
  status: PlanSheetStatus
  created_at: string
  updated_at: string
  sheets?: PlanSheet[]
}

export interface PlanSheet {
  id: string
  plan_set_id: string
  sheet_number: string      // e.g. "A-101"
  sheet_title: string       // e.g. "First Floor Plan"
  discipline: string        // e.g. "Architectural", "Structural"
  storage_path: string      // Supabase Storage path
  signed_url?: string       // Temporary signed URL for display
  thumbnail_url?: string
  width_px: number
  height_px: number
  scale_ratio?: number      // pixels per foot, derived from calibration
  scale_source?: string     // "manual" | "auto_detected"
  page_number: number       // page index in the original PDF
  status: PlanSheetStatus
  created_at: string
}

export interface Takeoff {
  id: string
  project_id: string
  plan_set_id: string
  name: string
  description?: string
  status: TakeoffStatus
  created_by: string
  created_at: string
  updated_at: string
  items?: TakeoffItem[]
  summary?: TakeoffQASummary
}

export interface TakeoffItem {
  id: string
  takeoff_id: string
  plan_sheet_id: string
  shape_type: ShapeType
  geometry: ShapeGeometry          // JSONB
  quantity: number
  quantity_with_waste?: number
  unit: UnitType
  csi_code: string
  csi_description: string
  label: string
  confidence: number               // 0.0 – 1.0
  status: TakeoffItemStatus
  reviewed_by?: string
  reviewed_at?: string
  override_qty?: number
  override_reason?: string
  ai_model_source?: string         // "claude" | "gpt4o" | "consensus"
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

// ─── Geometry ────────────────────────────────────────────────

export interface Point2D {
  x: number
  y: number
}

export type ShapeGeometry =
  | PolygonGeometry
  | PolylineGeometry
  | RectangleGeometry
  | CountGeometry

export interface PolygonGeometry {
  type: 'polygon'
  points: Point2D[]
  area_px2: number
}

export interface PolylineGeometry {
  type: 'polyline'
  points: Point2D[]
  length_px: number
}

export interface RectangleGeometry {
  type: 'rectangle'
  left: number
  top: number
  width: number
  height: number
  area_px2: number
}

export interface CountGeometry {
  type: 'count'
  points: Point2D[]   // one point per counted instance
  count: number
}

// ─── Scale Calibration ───────────────────────────────────────

export interface ScaleCalibration {
  reference_length_px: number      // measured in pixels on canvas
  reference_length_real: number    // real-world length (in feet)
  pixels_per_foot: number          // derived ratio
  scale_string: string             // e.g. "1/4\" = 1'-0\""
  calibrated_at: string
  calibrated_by: string
}

export interface ParsedDimension {
  value_feet: number               // always in decimal feet
  original_string: string
  unit_detected: 'feet' | 'inches' | 'metric'
}

// ─── AI Vision ───────────────────────────────────────────────

export interface AIDetectionResult {
  symbol_description: string
  bounding_box: { x: number; y: number; width: number; height: number }
  suggested_csi_code: string
  suggested_csi_description: string
  confidence: number
  model_source: 'claude' | 'gpt4o'
  raw_label: string
}

export interface DualModelResult {
  claude_detections: AIDetectionResult[]
  gpt4o_detections: AIDetectionResult[]
  consensus_detections: AIDetectionResult[]   // merged + reconciled
  agreement_score: number                      // 0–1, how much models agreed
  processing_time_ms: number
}

export interface ExtractionRequest {
  plan_sheet_id: string
  image_base64: string
  trade_focus?: string[]           // e.g. ["electrical", "plumbing"]
  existing_csi_codes?: string[]    // codes already in this project's estimate
}

// ─── Dynamic Linker ──────────────────────────────────────────

export interface CSILinkResult {
  csi_code: string
  csi_description: string
  division: number
  unit: UnitType
  confidence: number
  match_method: 'exact' | 'fuzzy' | 'ai_suggested' | 'manual'
}

// ─── Validation & QA ─────────────────────────────────────────

export interface TakeoffQASummary {
  takeoff_id: string
  total_items: number
  ai_detected: number
  pending_review: number
  approved: number
  flagged: number
  overridden: number
  avg_confidence: number
  low_confidence_count: number     // confidence < 0.65
  completion_pct: number           // (approved + overridden) / total
}

export interface ValidationResult {
  item_id: string
  confidence_score: number
  flags: ValidationFlag[]
  recommendation: 'approve' | 'review' | 'flag'
}

export interface ValidationFlag {
  code: string
  message: string
  severity: 'info' | 'warning' | 'error'
}

// ─── Formula Engine ──────────────────────────────────────────

export interface CalculationInput {
  geometry: ShapeGeometry
  scale_ratio: number              // pixels_per_foot
  mode: MeasurementMode
  waste_factor_pct?: number        // e.g. 10 = 10% waste
}

export interface CalculationResult {
  raw_quantity: number
  quantity_with_waste: number
  unit: UnitType
  calculation_detail: string       // human-readable explanation
}

// ─── Upload ──────────────────────────────────────────────────

export interface UploadProgress {
  file_name: string
  total_pages: number
  pages_processed: number
  status: 'uploading' | 'extracting_pages' | 'creating_records' | 'complete' | 'error'
  error_message?: string
}

// ─── API Request/Response shapes ─────────────────────────────

export interface CreatePlanSetRequest {
  project_id: string
  name: string
  version?: string
}

export interface CreateTakeoffRequest {
  project_id: string
  plan_set_id: string
  name: string
  description?: string
}

export interface CreateTakeoffItemRequest {
  plan_sheet_id: string
  shape_type: ShapeType
  geometry: ShapeGeometry
  quantity: number
  unit: UnitType
  csi_code: string
  csi_description: string
  label: string
  confidence?: number
  status?: TakeoffItemStatus
}

export interface UpdateTakeoffItemRequest {
  geometry?: ShapeGeometry
  quantity?: number
  unit?: UnitType
  csi_code?: string
  label?: string
  status?: TakeoffItemStatus
  override_qty?: number
  override_reason?: string
}

export interface ApproveTakeoffItemRequest {
  reviewed_by: string
}

export interface FlagTakeoffItemRequest {
  reviewed_by: string
  reason?: string
}

export interface OverrideTakeoffItemRequest {
  reviewed_by: string
  override_qty: number
  override_reason: string
}
