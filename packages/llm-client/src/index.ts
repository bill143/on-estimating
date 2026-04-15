// @on/llm-client — Typed client for the NEXUS LLM API

export { LLMClient, LLMClientError, createLLMClient } from './client';

export type {
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
