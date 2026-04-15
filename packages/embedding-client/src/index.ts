// @on/embedding-client — Typed client for the NEXUS Embedding Engine

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Configuration for creating an embedding client instance. */
export interface EmbeddingConfig {
  /** Base URL of the NEXUS Embedding API (e.g. "http://localhost:8000"). */
  baseUrl: string;
  /** API key for authentication. Sent as Bearer token. */
  apiKey?: string;
  /** Default embedding model to use. */
  defaultModel?: string;
  /** Request timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
  /** Maximum retry attempts on transient failures. Default: 2. */
  maxRetries?: number;
  /** Custom headers to include in every request. */
  headers?: Record<string, string>;
}

/** Result from embedding a document with metadata. */
export interface EmbeddingResult {
  /** The embedding vector. */
  embedding: number[];
  /** The original text that was embedded. */
  text: string;
  /** Model used to generate the embedding. */
  model: string;
  /** Dimensionality of the embedding vector. */
  dimensions: number;
  /** Token count for the input text. */
  tokenCount: number;
  /** Metadata attached to the document. */
  metadata: Record<string, unknown>;
  /** Unique identifier for the stored embedding. */
  id: string;
}

/** A similar document returned from a similarity search. */
export interface SimilarResult {
  /** Unique identifier of the matched document. */
  id: string;
  /** The text content of the matched document. */
  text: string;
  /** Cosine similarity score (0-1, higher is more similar). */
  score: number;
  /** Metadata attached to the matched document. */
  metadata: Record<string, unknown>;
  /** Rank in the result set (1-based). */
  rank: number;
}

/** Health check response from the embedding engine. */
export interface HealthStatus {
  /** Whether the service is operational. */
  healthy: boolean;
  /** Current service status description. */
  status: string;
  /** Available embedding models. */
  models: string[];
  /** Number of stored embeddings. */
  totalEmbeddings: number;
  /** Service uptime in seconds. */
  uptimeSeconds: number;
  /** API version. */
  version: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/** Structured error from the NEXUS Embedding API. */
export class EmbeddingClientError extends Error {
  readonly status: number;
  readonly type: string;
  readonly code: string | null;

  constructor(message: string, status: number, type = 'api_error', code: string | null = null) {
    super(message);
    this.name = 'EmbeddingClientError';
    this.status = status;
    this.type = type;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Raw API response types (snake_case from server)
// ---------------------------------------------------------------------------

interface RawEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage?: { prompt_tokens: number; total_tokens: number };
}

interface RawDocumentResponse {
  id: string;
  embedding: number[];
  text: string;
  model: string;
  dimensions: number;
  token_count: number;
  metadata: Record<string, unknown>;
}

interface RawSimilarResponse {
  results: Array<{
    id: string;
    text: string;
    score: number;
    metadata: Record<string, unknown>;
    rank: number;
  }>;
}

interface RawHealthResponse {
  healthy: boolean;
  status: string;
  models: string[];
  total_embeddings: number;
  uptime_seconds: number;
  version: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

/**
 * EmbeddingClient — typed client for the NEXUS Embedding Engine.
 *
 * Provides single/batch embedding, document storage with metadata,
 * similarity search, and CSI-code-specific embedding for construction.
 */
export class EmbeddingClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly headers: Record<string, string>;

  constructor(config: EmbeddingConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? 'text-embedding-3-small';
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    if (this.apiKey) {
      this.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
  }

  // ---------------------------------------------------------------------------
  // embed — single text to vector
  // ---------------------------------------------------------------------------

  async embed(text: string, model?: string): Promise<number[]> {
    const raw = await this.post<RawEmbeddingResponse>('/v1/embeddings', {
      input: [text],
      model: model ?? this.defaultModel,
    });

    const first = raw.data[0];
    if (!first) {
      throw new EmbeddingClientError('Empty embedding response', 500, 'server_error');
    }
    return first.embedding;
  }

  // ---------------------------------------------------------------------------
  // embedBatch — multiple texts to vectors
  // ---------------------------------------------------------------------------

  async embedBatch(texts: string[], model?: string): Promise<number[][]> {
    if (texts.length === 0) return [];

    const raw = await this.post<RawEmbeddingResponse>('/v1/embeddings', {
      input: texts,
      model: model ?? this.defaultModel,
    });

    return raw.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }

  // ---------------------------------------------------------------------------
  // embedDocument — embed with metadata for later retrieval
  // ---------------------------------------------------------------------------

  async embedDocument(
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<EmbeddingResult> {
    const raw = await this.post<RawDocumentResponse>('/v1/documents', {
      text,
      model: this.defaultModel,
      metadata: metadata ?? {},
    });

    return {
      embedding: raw.embedding,
      text: raw.text,
      model: raw.model,
      dimensions: raw.dimensions,
      tokenCount: raw.token_count,
      metadata: raw.metadata,
      id: raw.id,
    };
  }

  // ---------------------------------------------------------------------------
  // findSimilar — semantic similarity search
  // ---------------------------------------------------------------------------

  async findSimilar(
    queryText: string,
    collection: string,
    topK = 5,
  ): Promise<SimilarResult[]> {
    const raw = await this.post<RawSimilarResponse>('/v1/search', {
      query: queryText,
      collection,
      top_k: topK,
      model: this.defaultModel,
    });

    return raw.results.map(
      (r): SimilarResult => ({
        id: r.id,
        text: r.text,
        score: r.score,
        metadata: r.metadata,
        rank: r.rank,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // embedCSICode — construction-specific: embed a CSI MasterFormat code
  // ---------------------------------------------------------------------------

  async embedCSICode(csiCode: string): Promise<number[]> {
    const prefixedText = `CSI MasterFormat Division ${csiCode}`;
    return this.embed(prefixedText);
  }

  // ---------------------------------------------------------------------------
  // health — check engine status
  // ---------------------------------------------------------------------------

  async health(): Promise<HealthStatus> {
    const raw = await this.get<RawHealthResponse>('/health');

    return {
      healthy: raw.healthy,
      status: raw.status,
      models: raw.models,
      totalEmbeddings: raw.total_embeddings,
      uptimeSeconds: raw.uptime_seconds,
      version: raw.version,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP helpers
  // ---------------------------------------------------------------------------

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errObj = errBody as { error?: { message?: string; type?: string; code?: string } };
      throw new EmbeddingClientError(
        String(errObj.error?.message ?? response.statusText),
        response.status,
        String(errObj.error?.type ?? 'api_error'),
        errObj.error?.code ?? null,
      );
    }

    return response.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new EmbeddingClientError(response.statusText, response.status);
    }

    return response.json() as Promise<T>;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempt = 0,
  ): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt >= this.maxRetries) throw err;

      const isRetryable =
        err instanceof TypeError ||
        (err instanceof DOMException && err.name === 'TimeoutError');

      if (!isRetryable) throw err;

      const delayMs = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, delayMs));
      return this.fetchWithRetry(url, init, attempt + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create a configured EmbeddingClient instance. */
export function createEmbeddingClient(config: EmbeddingConfig): EmbeddingClient {
  return new EmbeddingClient(config);
}
