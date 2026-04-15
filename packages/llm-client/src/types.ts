// @on/llm-client — TypeScript interfaces for the NEXUS LLM API

/** Configuration for creating an LLM client instance. */
export interface LLMConfig {
  /** Base URL of the NEXUS LLM API server (e.g. "http://localhost:8000"). */
  baseUrl: string;
  /** API key for authentication. Sent as Bearer token. */
  apiKey?: string;
  /** Default model to use when not specified per-request. */
  defaultModel?: string;
  /** Request timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
  /** Maximum retry attempts on transient failures. Default: 2. */
  maxRetries?: number;
  /** Custom headers to include in every request. */
  headers?: Record<string, string>;
}

/** A single message in a chat conversation. */
export interface ChatMessage {
  /** The role of the message author. */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** The text content of the message. */
  content: string;
  /** Optional name for the participant. */
  name?: string;
}

/** Options for a chat completion request. */
export interface ChatOptions {
  /** Model to use for this request. Overrides defaultModel. */
  model?: string;
  /** Sampling temperature (0-2). Higher = more creative. */
  temperature?: number;
  /** Nucleus sampling threshold (0-1). */
  topP?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /** Stop sequences that halt generation. */
  stop?: string[];
  /** Number of completions to generate. */
  n?: number;
  /** Penalize repeated tokens in output. */
  frequencyPenalty?: number;
  /** Penalize tokens already present in context. */
  presencePenalty?: number;
  /** Unique end-user identifier for abuse tracking. */
  user?: string;
  /** Abort signal for request cancellation. */
  signal?: AbortSignal;
}

/** Token usage breakdown for a completion. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** A single choice in a chat completion response. */
export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

/** Full response from a chat completion request. */
export interface ChatResponse {
  /** Unique response identifier. */
  id: string;
  /** Model that generated the response. */
  model: string;
  /** Unix timestamp of when the response was created. */
  created: number;
  /** Array of completion choices. */
  choices: ChatChoice[];
  /** Token usage statistics. */
  usage: TokenUsage;
}

/** A single streaming event during token generation. */
export interface StreamEvent {
  /** Event type: token for incremental text, done when generation completes, error on failure. */
  type: 'token' | 'thinking_start' | 'thinking_end' | 'done' | 'error';
  /** The token text (for type=token). */
  data: string;
  /** The model that generated this event. */
  model?: string;
  /** Finish reason (only present when type=done). */
  finishReason?: 'stop' | 'length' | null;
  /** Token usage (only present when type=done). */
  usage?: TokenUsage;
  /** Error message (only present when type=error). */
  error?: string;
}

/** Result from an embedding request. */
export interface EmbeddingResult {
  /** The embedding vector. */
  embedding: number[];
  /** Index in the input array. */
  index: number;
  /** The input text that was embedded. */
  text: string;
  /** Token count for this input. */
  tokenCount: number;
}

/** Response from an embedding request (may contain multiple results). */
export interface EmbeddingResponse {
  model: string;
  results: EmbeddingResult[];
  usage: TokenUsage;
}

/** Information about an available model. */
export interface ModelInfo {
  id: string;
  ownedBy: string;
  created: number;
}

/** Error returned by the NEXUS LLM API. */
export interface LLMError {
  message: string;
  type: string;
  code: string | null;
  status: number;
}
