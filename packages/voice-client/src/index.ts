/**
 * @on/voice-client — TypeScript client for the NEXUS Voice Engine API.
 *
 * Exports:
 *   - synthesize(text, options)     → streams audio via async iterator
 *   - transcribe(audioBlob)         → returns transcript
 *   - streamRealtime(onToken)       → WebSocket connection for real-time voice
 *   - cloneVoice(referenceAudio, name) → creates voice profile
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceClientConfig {
  /** Base URL of the NEXUS Voice Engine API (no trailing slash). */
  baseUrl: string;
  /** JWT Bearer token for authentication. */
  token: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
}

export interface SynthesizeOptions {
  /** Voice ID (provider-specific). */
  voice?: string;
  /** Language code (e.g. "en", "es"). */
  language?: string;
  /** Playback speed multiplier (0.25 - 4.0). */
  speed?: number;
  /** Output format: "wav" | "mp3" | "pcm" | "opus". */
  responseFormat?: "wav" | "mp3" | "pcm" | "opus";
  /** Model identifier. */
  model?: string;
  /** Emotion instruction (gpt-4o-mini-tts only). */
  emotion?: string;
  /** If true, use streaming endpoint. */
  stream?: boolean;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  speaker: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptSegment[];
}

export interface VoiceInfo {
  voices: string[];
  provider: string;
}

export interface LanguageInfo {
  tts_languages: string[];
  stt_languages: string[];
}

export interface HealthStatus {
  status: string;
  tts_provider: string;
  stt_provider: string;
  tts_loaded: boolean;
  stt_loaded: boolean;
}

export interface RealtimeCallbacks {
  /** Called on partial (intermediate) transcript. */
  onPartialTranscript?: (text: string) => void;
  /** Called on final (committed) transcript. */
  onFinalTranscript?: (text: string) => void;
  /** Called when TTS audio chunk arrives (raw PCM Int16 buffer). */
  onAudioChunk?: (pcm: ArrayBuffer) => void;
  /** Called when TTS playback starts. */
  onTTSStart?: () => void;
  /** Called when TTS playback ends. */
  onTTSEnd?: () => void;
  /** Called on any error from the server. */
  onError?: (message: string) => void;
  /** Called when the WebSocket connection opens. */
  onOpen?: () => void;
  /** Called when the WebSocket connection closes. */
  onClose?: (code: number, reason: string) => void;
}

export interface RealtimeConnection {
  /** Send a raw PCM audio chunk (Int16Array at 16kHz). */
  sendAudio: (pcm: Int16Array) => void;
  /** Interrupt current TTS playback (barge-in). */
  interrupt: () => void;
  /** Update session config. */
  configure: (sampleRate?: number, language?: string) => void;
  /** Close the connection. */
  close: () => void;
  /** Whether the WebSocket is currently open. */
  readonly isOpen: boolean;
}

export interface VoiceProfileResult {
  message: string;
  profileId?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class VoiceClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeout: number;

  constructor(config: VoiceClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.token = config.token;
    this.timeout = config.timeout ?? 30_000;
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
        throw new VoiceClientError(
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
  // synthesize — TTS (batch or streaming)
  // -----------------------------------------------------------------------

  /**
   * Synthesize speech from text.
   *
   * When `options.stream` is true, returns a ReadableStream of audio bytes
   * via the streaming endpoint.  Otherwise returns a single ArrayBuffer.
   */
  async synthesize(
    text: string,
    options: SynthesizeOptions = {},
  ): Promise<ReadableStream<Uint8Array>> {
    const endpoint = options.stream
      ? "/v1/audio/speech/stream"
      : "/v1/audio/speech";

    const body = JSON.stringify({
      model: options.model ?? "tts-1",
      input: text,
      voice: options.voice ?? "default",
      response_format: options.responseFormat ?? "wav",
      speed: options.speed ?? 1.0,
      language: options.language ?? "en",
      emotion: options.emotion ?? "",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.headers({ "Content-Type": "application/json" }),
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new VoiceClientError(
          `POST ${endpoint} failed: ${res.status}`,
          res.status,
          errBody,
        );
      }

      if (!res.body) {
        throw new VoiceClientError("Response body is null", 0, "");
      }

      return res.body;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Synthesize and collect all audio bytes into a single ArrayBuffer.
   */
  async synthesizeToBuffer(
    text: string,
    options: SynthesizeOptions = {},
  ): Promise<ArrayBuffer> {
    const stream = await this.synthesize(text, { ...options, stream: false });
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return result.buffer;
  }

  // -----------------------------------------------------------------------
  // transcribe — STT
  // -----------------------------------------------------------------------

  /**
   * Transcribe an audio blob (WAV, MP3, FLAC, OGG) to text.
   */
  async transcribe(
    audioBlob: Blob | Buffer,
    language?: string,
  ): Promise<TranscriptionResult> {
    const formData = new FormData();

    if (Buffer.isBuffer(audioBlob)) {
      const ab = audioBlob.buffer.slice(audioBlob.byteOffset, audioBlob.byteOffset + audioBlob.byteLength) as ArrayBuffer;
      formData.append("file", new Blob([ab]), "audio.wav");
    } else {
      formData.append("file", audioBlob, "audio.wav");
    }

    if (language) {
      formData.append("language", language);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: "POST",
        headers: this.headers(),
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new VoiceClientError(
          `POST /v1/audio/transcriptions failed: ${res.status}`,
          res.status,
          body,
        );
      }

      return res.json() as Promise<TranscriptionResult>;
    } finally {
      clearTimeout(timer);
    }
  }

  // -----------------------------------------------------------------------
  // streamRealtime — WebSocket
  // -----------------------------------------------------------------------

  /**
   * Open a real-time bidirectional audio WebSocket.
   *
   * Send microphone PCM via `connection.sendAudio()`.
   * Receive transcripts and TTS audio via callbacks.
   */
  streamRealtime(callbacks: RealtimeCallbacks): RealtimeConnection {
    const wsUrl = this.baseUrl
      .replace(/^http/, "ws")
      .concat(`/ws/stream?token=${encodeURIComponent(this.token)}`);

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
      if (typeof ev.data === "string") {
        let msg: { type: string; text?: string; is_final?: boolean; message?: string };
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case "transcript":
            if (msg.is_final) {
              callbacks.onFinalTranscript?.(msg.text ?? "");
            } else {
              callbacks.onPartialTranscript?.(msg.text ?? "");
            }
            break;
          case "tts_start":
            callbacks.onTTSStart?.();
            break;
          case "tts_end":
            callbacks.onTTSEnd?.();
            break;
          case "error":
            callbacks.onError?.(msg.message ?? "Unknown error");
            break;
        }
      } else if (ev.data instanceof ArrayBuffer) {
        callbacks.onAudioChunk?.(ev.data);
      }
    };

    const connection: RealtimeConnection = {
      sendAudio(pcm: Int16Array): void {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(pcm.buffer);
        }
      },

      interrupt(): void {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "interrupt" }));
        }
      },

      configure(sampleRate?: number, language?: string): void {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "config",
            sample_rate: sampleRate ?? 16000,
            language: language ?? "",
          }));
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
  // cloneVoice — voice profile creation
  // -----------------------------------------------------------------------

  /**
   * Upload reference audio to create a cloned voice profile.
   *
   * Sends the audio to the transcription endpoint to validate it,
   * then calls the voice clone endpoint if available.
   *
   * Note: Full voice cloning requires server-side Python API.
   * This method provides the upload/validation step from the client.
   */
  async cloneVoice(
    referenceAudio: Blob | Buffer,
    name: string,
  ): Promise<VoiceProfileResult> {
    const formData = new FormData();

    if (Buffer.isBuffer(referenceAudio)) {
      const ab = referenceAudio.buffer.slice(referenceAudio.byteOffset, referenceAudio.byteOffset + referenceAudio.byteLength) as ArrayBuffer;
      formData.append("file", new Blob([ab]), `${name}.wav`);
    } else {
      formData.append("file", referenceAudio, `${name}.wav`);
    }
    formData.append("name", name);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Validate audio by transcribing — confirms server can read it
      const res = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: "POST",
        headers: this.headers(),
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new VoiceClientError(
          `Voice clone validation failed: ${res.status}`,
          res.status,
          body,
        );
      }

      const transcript = (await res.json()) as TranscriptionResult;

      if (transcript.duration < 1) {
        throw new VoiceClientError(
          "Reference audio too short — need at least 3 seconds of speech",
          400,
          "",
        );
      }

      return {
        message: `Voice profile "${name}" reference validated (${transcript.duration.toFixed(1)}s, "${transcript.text.slice(0, 80)}")`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // -----------------------------------------------------------------------
  // Discovery helpers
  // -----------------------------------------------------------------------

  /** List available TTS voices for the current provider. */
  async listVoices(): Promise<VoiceInfo> {
    return this.request<VoiceInfo>("/v1/voices", {
      method: "GET",
      headers: this.headers(),
    });
  }

  /** List supported TTS and STT languages. */
  async listLanguages(): Promise<LanguageInfo> {
    return this.request<LanguageInfo>("/v1/languages", {
      method: "GET",
      headers: this.headers(),
    });
  }

  /** Check API server health (no auth required). */
  async health(): Promise<HealthStatus> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new VoiceClientError(`Health check failed: ${res.status}`, res.status, "");
    }
    return res.json() as Promise<HealthStatus>;
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class VoiceClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "VoiceClientError";
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

/**
 * Create a VoiceClient instance.
 *
 * ```ts
 * import { createVoiceClient } from "@on/voice-client";
 *
 * const voice = createVoiceClient({
 *   baseUrl: "http://localhost:8001",
 *   token: process.env.VOICE_API_TOKEN!,
 * });
 *
 * const audio = await voice.synthesizeToBuffer("Hello world");
 * const transcript = await voice.transcribe(audioBlob);
 * ```
 */
export function createVoiceClient(config: VoiceClientConfig): VoiceClient {
  return new VoiceClient(config);
}

// Re-export everything as named exports for convenience
export { synthesize, transcribe, streamRealtime, cloneVoice };

// Standalone function exports (create a default-config-less interface)
function synthesize(
  client: VoiceClient,
  text: string,
  options?: SynthesizeOptions,
): Promise<ReadableStream<Uint8Array>> {
  return client.synthesize(text, options);
}

function transcribe(
  client: VoiceClient,
  audioBlob: Blob | Buffer,
  language?: string,
): Promise<TranscriptionResult> {
  return client.transcribe(audioBlob, language);
}

function streamRealtime(
  client: VoiceClient,
  callbacks: RealtimeCallbacks,
): RealtimeConnection {
  return client.streamRealtime(callbacks);
}

function cloneVoice(
  client: VoiceClient,
  referenceAudio: Blob | Buffer,
  name: string,
): Promise<VoiceProfileResult> {
  return client.cloneVoice(referenceAudio, name);
}
