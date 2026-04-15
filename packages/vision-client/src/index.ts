/**
 * @on/vision-client — TypeScript client for the NEXUS Vision Engine API.
 *
 * Exports:
 *   - createVisionClient(config)        → factory function
 *   - VisionClient class with:
 *       analyzePlan(fileUrl, opts)       → full plan analysis
 *       fastPass(fileUrl)               → immediate text extraction
 *       deepPass(fileUrl)               → full analysis with confidence scores
 *       extractTables(fileUrl)          → structured table data
 *       streamResults(jobId, onResult)  → WebSocket for real-time results
 *       getJobStatus(jobId)             → poll job status
 *
 * Types aligned with @on/ocr-engine domain (BoundingBox, DetectedSymbol,
 * ConstructionSymbolType, ExtractedTable, DeepElement, Keynote, etc.).
 */

// ---------------------------------------------------------------------------
// Types — Configuration
// ---------------------------------------------------------------------------

export interface VisionConfig {
  /** Base URL of the NEXUS Vision Engine API (no trailing slash). */
  baseUrl: string;
  /** JWT Bearer token for authentication. */
  token: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
}

/** @deprecated Use VisionConfig instead. */
export type VisionClientConfig = VisionConfig;

// ---------------------------------------------------------------------------
// Types — Geometry
// ---------------------------------------------------------------------------

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Types — Fast Pass
// ---------------------------------------------------------------------------

export interface FastPassOptions {
  /** Plan sheet ID for tracking. */
  sheetId?: string;
}

export interface LayoutBlock {
  id: number;
  type: "text" | "title" | "table" | "figure" | "list" | "header" | "footer";
  bbox: BoundingBox;
  content: string;
  confidence: number;
}

export interface FastPassResult {
  text: string;
  layout: LayoutBlock[];
  readingOrder: number[];
  pageCount: number;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Types — Deep Pass
// ---------------------------------------------------------------------------

export interface DeepPassOptions {
  /** Plan sheet ID for tracking. */
  sheetId?: string;
  /** Minimum confidence threshold (0-1). Elements below this are flagged. */
  confidenceThreshold?: number;
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

export interface DeepPassResult {
  text: string;
  elements: DeepElement[];
  keynotes: Keynote[];
  confidenceMap: Record<string, number>;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Types — Table Extraction
// ---------------------------------------------------------------------------

export interface ExtractTablesOptions {
  /** Plan sheet ID for tracking. */
  sheetId?: string;
}

export type TableType = "schedule" | "legend" | "keynote" | "material" | "general";

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  coordinates: BoundingBox;
  tableType: TableType;
  confidence: number;
}

export interface TableResult {
  tables: ExtractedTable[];
  totalTables: number;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Types — Symbol Detection
// ---------------------------------------------------------------------------

export type ConstructionSymbolType =
  | "door"
  | "window"
  | "column"
  | "electrical_fixture"
  | "plumbing_fixture"
  | "sprinkler_head"
  | "fire_alarm"
  | "mechanical_equipment"
  | "structural_member"
  | "generic";

export interface DetectedSymbol {
  type: ConstructionSymbolType;
  label: string;
  bbox: BoundingBox;
  count: number;
  confidence: number;
  attributes: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Types — Dimensions
// ---------------------------------------------------------------------------

export interface ExtractedDimension {
  original: string;
  valueFeet: number;
  valueInches: number;
  unit: string;
  isScale: boolean;
  scaleString?: string;
}

// ---------------------------------------------------------------------------
// Types — CSI Mapping
// ---------------------------------------------------------------------------

export interface CsiMappedItem {
  symbolType: ConstructionSymbolType | "dimension" | "keynote";
  label: string;
  csiCode: string;
  csiDescription: string;
  quantity: number;
  unit: string;
  shapeType: "count" | "polygon" | "line";
  geometry: BoundingBox;
  confidence: number;
  sourceStage: "fast_pass" | "deep_pass" | "table_extract" | "symbol_detect";
}

// ---------------------------------------------------------------------------
// Types — Full Analysis (analyzePlan)
// ---------------------------------------------------------------------------

export interface AnalyzePlanOptions {
  /** Plan sheet ID for tracking. */
  sheetId?: string;
  /** If true, skip the deep pass and return fast-pass only. */
  fastPassOnly?: boolean;
  /** Minimum confidence threshold (0-1). */
  confidenceThreshold?: number;
}

export interface VisionResult {
  planSheetId: string;
  fastPass: FastPassResult;
  deepPass: DeepPassResult | null;
  tables: ExtractedTable[];
  symbols: DetectedSymbol[];
  dimensions: ExtractedDimension[];
  csiMapped: CsiMappedItem[];
  itemsWritten: number;
  itemsFlagged: number;
  totalLatencyMs: number;
}

// ---------------------------------------------------------------------------
// Types — Job Status (async processing)
// ---------------------------------------------------------------------------

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobStatusResult {
  jobId: string;
  status: JobStatus;
  progress: number;
  stage: string;
  result: VisionResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Types — WebSocket Streaming
// ---------------------------------------------------------------------------

export interface StreamCallbacks {
  /** Called when a fast-pass result is available. */
  onFastPass?: (result: FastPassResult) => void;
  /** Called when a deep-pass result is available. */
  onDeepPass?: (result: DeepPassResult) => void;
  /** Called when tables are extracted. */
  onTables?: (tables: ExtractedTable[]) => void;
  /** Called when symbols are detected. */
  onSymbols?: (symbols: DetectedSymbol[]) => void;
  /** Called when dimensions are parsed. */
  onDimensions?: (dimensions: ExtractedDimension[]) => void;
  /** Called on incremental progress updates. */
  onProgress?: (stage: string, progress: number) => void;
  /** Called when the full analysis is complete. */
  onComplete?: (result: VisionResult) => void;
  /** Called on any error. */
  onError?: (message: string) => void;
  /** Called when the WebSocket connection opens. */
  onOpen?: () => void;
  /** Called when the WebSocket connection closes. */
  onClose?: (code: number, reason: string) => void;
}

export interface StreamConnection {
  /** Cancel the in-progress job. */
  cancel: () => void;
  /** Close the connection. */
  close: () => void;
  /** Whether the WebSocket is currently open. */
  readonly isOpen: boolean;
}

// ---------------------------------------------------------------------------
// Types — Health
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  modelsLoaded: string[];
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class VisionClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeout: number;

  constructor(config: VisionConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.token = config.token;
    this.timeout = config.timeout ?? 120_000;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      ...extra,
    };
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new VisionClientError(
          `${init.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText}`,
          res.status,
          body,
        );
      }

      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  // -----------------------------------------------------------------------
  // analyzePlan — full pipeline (fast pass + deep pass + tables + symbols)
  // -----------------------------------------------------------------------

  /**
   * Run the full vision analysis pipeline on a plan sheet.
   *
   * Calls POST /api/v1/analyze which orchestrates: pre-process → fast pass
   * → deep pass → table extraction → symbol detection → CSI mapping.
   *
   * @param fileUrl  URL or storage path of the plan sheet image/PDF.
   * @param opts     Analysis options (fastPassOnly, confidenceThreshold).
   * @returns        Complete VisionResult with all extracted data.
   */
  async analyzePlan(
    fileUrl: string,
    opts: AnalyzePlanOptions = {},
  ): Promise<VisionResult> {
    return this.request<VisionResult>("/api/v1/analyze", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        file_url: fileUrl,
        sheet_id: opts.sheetId ?? "",
        fast_pass_only: opts.fastPassOnly ?? false,
        confidence_threshold: opts.confidenceThreshold ?? 0.6,
      }),
    });
  }

  // -----------------------------------------------------------------------
  // fastPass — immediate text + layout extraction
  // -----------------------------------------------------------------------

  /**
   * Run the fast pass only — Marker + Surya text extraction.
   *
   * Returns text, layout blocks, and reading order within seconds.
   * No deep analysis, no symbol detection. Ideal for quick previews.
   */
  async fastPass(
    fileUrl: string,
    opts: FastPassOptions = {},
  ): Promise<FastPassResult> {
    return this.request<FastPassResult>("/api/v1/fast-pass", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        file_url: fileUrl,
        sheet_id: opts.sheetId ?? "",
      }),
    });
  }

  // -----------------------------------------------------------------------
  // deepPass — full analysis with confidence scores
  // -----------------------------------------------------------------------

  /**
   * Run the deep pass — MinerU + PaddleOCR-VL analysis.
   *
   * Returns elements, keynotes, and a confidence map. Higher latency
   * than fast pass but significantly more accurate and detailed.
   */
  async deepPass(
    fileUrl: string,
    opts: DeepPassOptions = {},
  ): Promise<DeepPassResult> {
    return this.request<DeepPassResult>("/api/v1/deep-pass", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        file_url: fileUrl,
        sheet_id: opts.sheetId ?? "",
        confidence_threshold: opts.confidenceThreshold ?? 0.6,
      }),
    });
  }

  // -----------------------------------------------------------------------
  // extractTables — structured table data
  // -----------------------------------------------------------------------

  /**
   * Extract structured tables from a plan sheet.
   *
   * Detects schedule, legend, keynote, and material tables using
   * Docling TableFormer. Returns headers, rows, and table type.
   */
  async extractTables(
    fileUrl: string,
    opts: ExtractTablesOptions = {},
  ): Promise<TableResult> {
    const raw = await this.request<{ tables: ExtractedTable[] }>("/api/v1/extract-tables", {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        file_url: fileUrl,
        sheet_id: opts.sheetId ?? "",
      }),
    });

    return {
      tables: raw.tables,
      totalTables: raw.tables.length,
      latencyMs: 0,
    };
  }

  // -----------------------------------------------------------------------
  // streamResults — WebSocket for real-time vision results
  // -----------------------------------------------------------------------

  /**
   * Stream real-time analysis results over WebSocket.
   *
   * Connects to the vision engine's streaming endpoint and receives
   * incremental results as each pipeline stage completes.
   *
   * @param jobId      Job ID returned by an async analyze call.
   * @param callbacks  Handlers for each result type.
   * @returns          StreamConnection with cancel/close methods.
   */
  streamResults(
    jobId: string,
    callbacks: StreamCallbacks,
  ): StreamConnection {
    const wsUrl = this.baseUrl
      .replace(/^http/, "ws")
      .concat(`/ws/results/${encodeURIComponent(jobId)}?token=${encodeURIComponent(this.token)}`);

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      callbacks.onOpen?.();
    };

    ws.onclose = (ev) => {
      callbacks.onClose?.(ev.code, ev.reason);
    };

    ws.onerror = () => {
      callbacks.onError?.("WebSocket connection error");
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;

      let msg: {
        type: string;
        stage?: string;
        progress?: number;
        data?: unknown;
        message?: string;
      };

      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "fast_pass":
          callbacks.onFastPass?.(msg.data as FastPassResult);
          break;
        case "deep_pass":
          callbacks.onDeepPass?.(msg.data as DeepPassResult);
          break;
        case "tables":
          callbacks.onTables?.(msg.data as ExtractedTable[]);
          break;
        case "symbols":
          callbacks.onSymbols?.(msg.data as DetectedSymbol[]);
          break;
        case "dimensions":
          callbacks.onDimensions?.(msg.data as ExtractedDimension[]);
          break;
        case "progress":
          callbacks.onProgress?.(msg.stage ?? "", msg.progress ?? 0);
          break;
        case "complete":
          callbacks.onComplete?.(msg.data as VisionResult);
          break;
        case "error":
          callbacks.onError?.(msg.message ?? "Unknown error");
          break;
      }
    };

    const connection: StreamConnection = {
      cancel(): void {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "cancel" }));
        }
      },

      close(): void {
        ws.close(1000, "Client closed");
      },

      get isOpen(): boolean {
        return ws.readyState === WebSocket.OPEN;
      },
    };

    return connection;
  }

  // -----------------------------------------------------------------------
  // getJobStatus — poll async job
  // -----------------------------------------------------------------------

  /**
   * Get the status of an asynchronous analysis job.
   *
   * Use this to poll for completion when not using WebSocket streaming.
   */
  async getJobStatus(jobId: string): Promise<JobStatusResult> {
    return this.request<JobStatusResult>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, {
      method: "GET",
      headers: this.headers(),
    });
  }

  /**
   * Poll a job until it completes or fails.
   *
   * @param jobId       Job ID to poll.
   * @param intervalMs  Polling interval in milliseconds (default 2000).
   * @param maxWaitMs   Maximum wait time before throwing (default 300000 = 5min).
   * @returns           The completed VisionResult.
   */
  async waitForJob(
    jobId: string,
    intervalMs: number = 2000,
    maxWaitMs: number = 300_000,
  ): Promise<VisionResult> {
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const status = await this.getJobStatus(jobId);

      if (status.status === "completed" && status.result) {
        return status.result;
      }

      if (status.status === "failed") {
        throw new VisionClientError(
          `Job ${jobId} failed: ${status.error ?? "unknown error"}`,
          500,
          status.error ?? "",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new VisionClientError(
      `Job ${jobId} timed out after ${maxWaitMs}ms`,
      408,
      "",
    );
  }

  // -----------------------------------------------------------------------
  // Discovery / health
  // -----------------------------------------------------------------------

  /** Check API server health (no auth required). */
  async health(): Promise<HealthStatus> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new VisionClientError(
        `Health check failed: ${res.status}`,
        res.status,
        "",
      );
    }
    return res.json() as Promise<HealthStatus>;
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class VisionClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "VisionClientError";
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

/**
 * Create a VisionClient instance.
 *
 * ```ts
 * import { createVisionClient } from "@on/vision-client";
 *
 * const vision = createVisionClient({
 *   baseUrl: "http://localhost:8002",
 *   token: process.env.VISION_API_TOKEN!,
 * });
 *
 * const result = await vision.analyzePlan("https://storage/plan-sheet-A1.pdf");
 * console.log(result.symbols);   // DetectedSymbol[]
 * console.log(result.tables);    // ExtractedTable[]
 * console.log(result.dimensions); // ExtractedDimension[]
 * ```
 */
export function createVisionClient(config: VisionConfig): VisionClient {
  return new VisionClient(config);
}

// ---------------------------------------------------------------------------
// Standalone function exports (mirror voice-client pattern)
// ---------------------------------------------------------------------------

export { analyzePlan, fastPass, deepPass, extractTables, streamResults, getJobStatus };

function analyzePlan(
  client: VisionClient,
  fileUrl: string,
  opts?: AnalyzePlanOptions,
): Promise<VisionResult> {
  return client.analyzePlan(fileUrl, opts);
}

function fastPass(
  client: VisionClient,
  fileUrl: string,
  opts?: FastPassOptions,
): Promise<FastPassResult> {
  return client.fastPass(fileUrl, opts);
}

function deepPass(
  client: VisionClient,
  fileUrl: string,
  opts?: DeepPassOptions,
): Promise<DeepPassResult> {
  return client.deepPass(fileUrl, opts);
}

function extractTables(
  client: VisionClient,
  fileUrl: string,
  opts?: ExtractTablesOptions,
): Promise<TableResult> {
  return client.extractTables(fileUrl, opts);
}

function streamResults(
  client: VisionClient,
  jobId: string,
  callbacks: StreamCallbacks,
): StreamConnection {
  return client.streamResults(jobId, callbacks);
}

function getJobStatus(
  client: VisionClient,
  jobId: string,
): Promise<JobStatusResult> {
  return client.getJobStatus(jobId);
}
