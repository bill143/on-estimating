'use client';

import { useEchoStore } from '@/lib/echo-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

const VOICE_OPTIONS = [
  { id: 'alloy', label: 'Alloy (Neutral)' },
  { id: 'echo', label: 'Echo (Male)' },
  { id: 'fable', label: 'Fable (British)' },
  { id: 'onyx', label: 'Onyx (Deep)' },
  { id: 'nova', label: 'Nova (Female)' },
  { id: 'shimmer', label: 'Shimmer (Warm)' },
];

export default function EchoSettings() {
  const settings = useEchoStore((s) => s.settings);
  const updateSettings = useEchoStore((s) => s.updateSettings);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-orange-600" />
          Echo AI Agent
        </h2>
        <p className="text-sm text-zinc-500">
          Configure your AI assistant. Echo roams the entire application and provides
          contextual help based on the page you're viewing.
        </p>
      </div>

      {/* Agent Name */}
      <div className="space-y-2">
        <Label htmlFor="echo-name">Agent Name</Label>
        <Input
          id="echo-name"
          value={settings.agentName}
          onChange={(e) => updateSettings({ agentName: e.target.value })}
          placeholder="Echo"
        />
        <p className="text-xs text-zinc-400">
          Customize what you call your AI assistant
        </p>
      </div>

      {/* Voice Selection */}
      <div className="space-y-2">
        <Label htmlFor="echo-voice">Voice</Label>
        <select
          id="echo-voice"
          value={settings.voiceId}
          onChange={(e) => updateSettings({ voiceId: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {VOICE_OPTIONS.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-400">
          Voice used for text-to-speech responses (requires API connection)
        </p>
      </div>

      {/* Wake Word Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Wake Word Detection</Label>
            <p className="text-xs text-zinc-400 mt-0.5">
              Respond to "Hi Echo" or "Echo" voice commands
            </p>
          </div>
          <button
            onClick={() => updateSettings({ wakeWordEnabled: !settings.wakeWordEnabled })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.wakeWordEnabled ? 'bg-orange-600' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.wakeWordEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Wake Word Sensitivity */}
        {settings.wakeWordEnabled && (
          <div className="space-y-2 pl-4 border-l-2 border-orange-200">
            <Label htmlFor="echo-sensitivity">Sensitivity</Label>
            <div className="flex items-center gap-4">
              <input
                id="echo-sensitivity"
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={settings.wakeWordSensitivity}
                onChange={(e) => updateSettings({ wakeWordSensitivity: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <span className="text-sm font-mono text-zinc-600 w-10 text-right">
                {(settings.wakeWordSensitivity * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Higher sensitivity means Echo responds to quieter or less precise wake words
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
