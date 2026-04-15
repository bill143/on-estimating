// @on/llm-client — LLMClient class and createLLMClient factory

import type {
  LLMConfig,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChoice,
  TokenUsage,
  StreamEvent,
  EmbeddingResult,
  EmbeddingResponse,
  ModelInfo,
  LLMError,
} from './types';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

/** Error class for NEXUS LLM API errors with structured detail. */
export class LLMClientError extends Error {
  readonly status: number;
  readonly type: string;
  readonly code: string | null;

  constructor(error: LLMError) {
    super(error.message);
    this.name = 'LLMClientError';
    this.status = error.status;
    this.type = error.type;
    this.code = error.code;
  }
}

/**
 * LLMClient — typed client for the NEXUS LLM OpenAI-compatible API.
 *
 * Provides chat completions, streaming, embeddings, and model listing.
 * Handles retries, timeouts, and structured error reporting.
 */
export class LLMClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly headers: Record<string, string>;

  constructor(config: LLMConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? 'nexus-default';
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
  // chat — non-streaming chat completion
  // ---------------------------------------------------------------------------

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResponse> {
    const model = opts?.model ?? this.defaultModel;
    const body = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
      })),
      stream: false,
      ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts?.topP !== undefined && { top_p: opts.topP }),
      ...(opts?.maxTokens !== undefined && { max_tokens: opts.maxTokens }),
      ...(opts?.stop && { stop: opts.stop }),
      ...(opts?.n !== undefined && { n: opts.n }),
      ...(opts?.frequencyPenalty !== undefined && { frequency_penalty: opts.frequencyPenalty }),
      ...(opts?.presencePenalty !== undefined && { presence_penalty: opts.presencePenalty }),
      ...(opts?.user && { user: opts.user }),
    };

    const raw = await this.request<RawChatResponse>(
      '/v1/chat/completions',
      body,
      opts?.signal,
    );

    return {
      id: raw.id,
      model: raw.model,
      created: raw.created,
      choices: raw.choices.map(
        (c): ChatChoice => ({
          index: c.index,
          message: { role: c.message.role as ChatMessage['role'], content: c.message.content },
          finishReason: c.finish_reason as ChatChoice['finishReason'],
        }),
      ),
      usage: {
        promptTokens: raw.usage.prompt_tokens,
        completionTokens: raw.usage.completion_tokens,
        totalTokens: raw.usage.total_tokens,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // stream — streaming chat completion with per-token callback
  // ---------------------------------------------------------------------------

  async stream(
    messages: ChatMessage[],
    onToken: (event: StreamEvent) => void,
    opts?: ChatOptions,
  ): Promise<void> {
    const model = opts?.model ?? this.defaultModel;
    const body = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
      })),
      stream: true,
      ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts?.topP !== undefined && { top_p: opts.topP }),
      ...(opts?.maxTokens !== undefined && { max_tokens: opts.maxTokens }),
      ...(opts?.stop && { stop: opts.stop }),
      ...(opts?.user && { user: opts.user }),
    };

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: opts?.signal ?? AbortSignal.timeout(this.timeoutMs),
      },
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new LLMClientError({
        message: String((errBody as { error?: { message?: string } }).error?.message ?? response.statusText),
        type: 'api_error',
        code: null,
        status: response.status,
      });
    }

    if (!response.body) {
      throw new LLMClientError({
        message: 'Response body is null — streaming not supported by server',
        type: 'client_error',
        code: 'no_body',
        status: 0,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (!trimmed.startsWith('data: ')) continue;

          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            onToken({ type: 'done', data: '', finishReason: 'stop' });
            return;
          }

          try {
            const chunk = JSON.parse(payload) as RawStreamChunk;
            const delta = chunk.choices?.[0]?.delta;
            const finishReason = chunk.choices?.[0]?.finish_reason;

            if (finishReason) {
              onToken({
                type: 'done',
                data: '',
                model: chunk.model,
                finishReason: finishReason as StreamEvent['finishReason'],
                usage: chunk.usage
                  ? {
                      promptTokens: chunk.usage.prompt_tokens,
                      completionTokens: chunk.usage.completion_tokens,
                      totalTokens: chunk.usage.total_tokens,
                    }
                  : undefined,
              });
            } else if (delta?.content) {
              onToken({
                type: 'token',
                data: delta.content,
                model: chunk.model,
              });
            }
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ---------------------------------------------------------------------------
  // embed — generate embeddings for text
  // ---------------------------------------------------------------------------

  async embed(
    text: string | string[],
    opts?: { model?: string; signal?: AbortSignal },
  ): Promise<EmbeddingResponse> {
    const input = Array.isArray(text) ? text : [text];
    const model = opts?.model ?? this.defaultModel;

    const raw = await this.request<RawEmbeddingResponse>(
      '/v1/embeddings',
      { model, input },
      opts?.signal,
    );

    return {
      model: raw.model,
      results: raw.data.map(
        (d, i): EmbeddingResult => ({
          embedding: d.embedding,
          index: d.index,
          text: input[i] ?? '',
          tokenCount: raw.usage?.total_tokens
            ? Math.round(raw.usage.total_tokens / input.length)
            : 0,
        }),
      ),
      usage: {
        promptTokens: raw.usage?.prompt_tokens ?? 0,
        completionTokens: 0,
        totalTokens: raw.usage?.total_tokens ?? 0,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // listModels — list available models on the server
  // ---------------------------------------------------------------------------

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    const raw = await this.requestGet<RawModelList>('/v1/models', signal);

    return raw.data.map(
      (m): ModelInfo => ({
        id: m.id,
        ownedBy: m.owned_by,
        created: m.created,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP helpers
  // ---------------------------------------------------------------------------

  private async request<T>(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      const errObj = errBody as { error?: { message?: string; type?: string; code?: string } };
      throw new LLMClientError({
        message: String(errObj.error?.message ?? response.statusText),
        type: String(errObj.error?.type ?? 'api_error'),
        code: errObj.error?.code ?? null,
        status: response.status,
      });
    }

    return response.json() as Promise<T>;
  }

  private async requestGet<T>(path: string, signal?: AbortSignal): Promise<T> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
      signal: signal ?? AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new LLMClientError({
        message: response.statusText,
        type: 'api_error',
        code: null,
        status: response.status,
      });
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
        err instanceof TypeError || // network error
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

/** Create a configured LLMClient instance. */
export function createLLMClient(config: LLMConfig): LLMClient {
  return new LLMClient(config);
}

// ---------------------------------------------------------------------------
// Raw API response types (snake_case from server)
// ---------------------------------------------------------------------------

interface RawChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string | null;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface RawStreamChunk {
  id?: string;
  model?: string;
  choices?: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface RawEmbeddingResponse {
  model: string;
  data: Array<{ embedding: number[]; index: number }>;
  usage?: { prompt_tokens: number; total_tokens: number };
}

interface RawModelList {
  data: Array<{ id: string; object: string; created: number; owned_by: string }>;
}
