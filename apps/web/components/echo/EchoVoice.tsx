// NEXUS ON Estimating — ECHO Voice Interface (Real-time STT + AI Chat + TTS)
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2, AlertCircle, Square } from 'lucide-react';
import { createVoiceClient, type RealtimeConnection } from '@on/voice-client';
import { useChatStore } from '@/lib/agents/chat-store';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type EchoState =
  | 'idle'        // Mic button visible, not active
  | 'listening'   // Mic on, streaming STT, showing live transcript
  | 'processing'  // Transcript sent to /api/ai/chat, waiting for response
  | 'speaking'    // TTS playing the AI response
  | 'error';      // Something went wrong

// ---------------------------------------------------------------------------
// Voice client singleton (created once per page lifecycle)
// ---------------------------------------------------------------------------

const VOICE_API_URL = process.env.NEXT_PUBLIC_VOICE_API_URL || 'http://localhost:8001';
const VOICE_API_TOKEN = process.env.NEXT_PUBLIC_VOICE_API_TOKEN || '';

function getVoiceClient() {
  return createVoiceClient({
    baseUrl: VOICE_API_URL,
    token: VOICE_API_TOKEN,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EchoVoice() {
  const { sendMessage, messages } = useChatStore();

  const [state, setState] = useState<EchoState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const connectionRef = useRef<RealtimeConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef('');

  // Clean up on unmount
  useEffect(() => {
    return () => {
      connectionRef.current?.close();
      audioContextRef.current?.close();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Start listening — open WebSocket, stream mic audio
  // -----------------------------------------------------------------------

  const startListening = useCallback(async () => {
    setErrorMessage('');
    setTranscript('');
    setAiResponse('');
    finalTranscriptRef.current = '';

    try {
      // Get mic permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });

      setState('listening');

      const voiceClient = getVoiceClient();
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      // Open real-time WebSocket
      const conn = voiceClient.streamRealtime({
        onOpen() {
          conn.configure(16000, 'en');
        },

        onPartialTranscript(text: string) {
          setTranscript(text);
          resetSilenceTimer();
        },

        onFinalTranscript(text: string) {
          finalTranscriptRef.current = text;
          setTranscript(text);
          resetSilenceTimer();
        },

        onError(message: string) {
          handleError(`Voice stream error: ${message}`);
        },

        onClose() {
          // Clean up mic stream
          stream.getTracks().forEach((t) => t.stop());
        },
      });

      connectionRef.current = conn;

      // Pipe mic audio into WebSocket
      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        }
        if (conn.isOpen) {
          conn.sendAudio(int16);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        handleError('Microphone access denied. Please allow mic permissions.');
      } else {
        handleError(`Could not start voice: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, []);

  // -----------------------------------------------------------------------
  // Silence timer — after 2s of no new transcript, finalize
  // -----------------------------------------------------------------------

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      finalize();
    }, 2000);
  }, []);

  // -----------------------------------------------------------------------
  // Stop listening — close mic, finalize transcript
  // -----------------------------------------------------------------------

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    connectionRef.current?.close();
    connectionRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    finalize();
  }, []);

  // -----------------------------------------------------------------------
  // Finalize — send transcript to chat, then speak response
  // -----------------------------------------------------------------------

  const finalize = useCallback(async () => {
    const text = finalTranscriptRef.current.trim() || transcript.trim();
    if (!text) {
      setState('idle');
      return;
    }

    // Close any lingering connection
    connectionRef.current?.close();
    connectionRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;

    setState('processing');

    try {
      // Send to the existing ECHO chat API
      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt:
            'You are the NEXUS ON Estimating AI voice assistant. Keep responses concise (2-3 sentences max) since they will be spoken aloud. Be direct and helpful for construction estimating questions.',
          messages: messages.slice(-6),
          userInput: text,
          context: {},
        }),
      });

      if (!chatRes.ok) {
        throw new Error(`Chat API returned ${chatRes.status}`);
      }

      const chatData = await chatRes.json();
      const responseText: string =
        chatData.response || 'Sorry, I could not process that.';

      setAiResponse(responseText);

      // Also push into the shared chat store so the sidebar shows the exchange
      await sendMessage(text);

      // Speak the response via TTS
      setState('speaking');
      await speakResponse(responseText);
      setState('idle');

    } catch (err) {
      handleError(`Failed to process: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [transcript, messages, sendMessage]);

  // -----------------------------------------------------------------------
  // TTS — synthesize and play audio
  // -----------------------------------------------------------------------

  const speakResponse = useCallback(async (text: string) => {
    try {
      const voiceClient = getVoiceClient();
      const audioStream = await voiceClient.synthesize(text, {
        voice: 'default',
        responseFormat: 'wav',
        speed: 1.0,
      });

      // Collect the stream into a single blob
      const reader = audioStream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0);
      const audioBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        audioBytes.set(chunk, offset);
        offset += chunk.byteLength;
      }

      // Play via Audio element (WAV)
      const blob = new Blob([audioBytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });

    } catch {
      // TTS failure is non-fatal — the text response is still shown
      console.warn('TTS playback failed — response shown as text only');
    }
  }, []);

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  const handleError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setState('error');
    connectionRef.current?.close();
    connectionRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage('');
    setTranscript('');
    setAiResponse('');
    setState('idle');
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Mic button only (idle state, inline with chat input)
  if (state === 'idle' && !transcript && !aiResponse) {
    return (
      <button
        onClick={startListening}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-amber-400 transition-all hover:bg-slate-700 hover:text-amber-300 active:scale-95"
        aria-label="Start voice input"
        title="Voice input"
      >
        <Mic className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Voice interaction panel */}
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">

        {/* State: Listening */}
        {state === 'listening' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
                <span className="text-xs font-medium text-amber-400">Listening...</span>
              </div>
              <button
                onClick={stopListening}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
                aria-label="Stop listening"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            </div>
            {transcript && (
              <p className="text-sm text-slate-200">{transcript}</p>
            )}
            {!transcript && (
              <p className="text-xs text-slate-500 italic">Speak now...</p>
            )}
          </div>
        )}

        {/* State: Processing */}
        {state === 'processing' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Thinking...</span>
            </div>
            {transcript && (
              <p className="text-sm text-slate-400 italic">&ldquo;{transcript}&rdquo;</p>
            )}
          </div>
        )}

        {/* State: Speaking */}
        {state === 'speaking' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-medium text-amber-400">Speaking...</span>
            </div>
            {aiResponse && (
              <p className="text-sm text-slate-200">{aiResponse}</p>
            )}
          </div>
        )}

        {/* State: Error */}
        {state === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">Voice Error</span>
              </div>
              <button
                onClick={dismissError}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-red-300/80">{errorMessage}</p>
          </div>
        )}

        {/* Idle with residual transcript/response visible */}
        {state === 'idle' && (transcript || aiResponse) && (
          <div className="flex flex-col gap-2">
            {transcript && (
              <p className="text-xs text-slate-500">You: &ldquo;{transcript}&rdquo;</p>
            )}
            {aiResponse && (
              <p className="text-sm text-slate-200">{aiResponse}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={startListening}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-slate-700"
              >
                <Mic className="h-3 w-3" />
                Speak again
              </button>
              <button
                onClick={() => {
                  setTranscript('');
                  setAiResponse('');
                }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
