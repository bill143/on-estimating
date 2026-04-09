'use client';

import { useState } from 'react';
import {
  BrainCircuit,
  Eye,
  EyeOff,
  ToggleLeft,
  MessageSquare,
  DollarSign,
  SlidersHorizontal,
  Zap,
  BarChart3,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/lib/settings-store';
import { testConnection } from '@/lib/ai';
import type { Verbosity, ClaudeModel, GPT4oModel } from '@/lib/settings-types';

// ── Constants ──────────────────────────

const CLAUDE_MODELS: { value: ClaudeModel; label: string }[] = [
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
];

const GPT4O_MODELS: { value: GPT4oModel; label: string }[] = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

const VERBOSITY_OPTIONS: { value: Verbosity; label: string; description: string }[] = [
  { value: 'concise', label: 'Concise', description: 'Brief answers with key data points only' },
  { value: 'detailed', label: 'Detailed', description: 'Full explanations with supporting context' },
  { value: 'expert', label: 'Expert', description: 'In-depth technical analysis with methodology notes' },
];

// ── Section wrapper ────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof BrainCircuit;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-zinc-200 bg-white">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-900">{title}</CardTitle>
            {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────

export default function AIConfiguration() {
  const aiConfig = useSettingsStore((s) => s.aiConfig);
  const updateAIConfig = useSettingsStore((s) => s.updateAIConfig);

  // Local form state (saved on "Save All" click)
  const [primaryEngine, setPrimaryEngine] = useState(aiConfig.primaryEngine);
  const [claudeModel, setClaudeModel] = useState(aiConfig.claudeModel);
  const [gpt4oModel, setGpt4oModel] = useState(aiConfig.gpt4oModel);
  const [claudeApiKey, setClaudeApiKey] = useState(aiConfig.claudeApiKey);
  const [openaiApiKey, setOpenaiApiKey] = useState(aiConfig.openaiApiKey);
  const [confidenceThreshold, setConfidenceThreshold] = useState(aiConfig.confidenceThreshold);
  const [tokenBudgetPerQuery, setTokenBudgetPerQuery] = useState(aiConfig.tokenBudgetPerQuery);
  const [temperature, setTemperature] = useState(aiConfig.temperature);
  const [fallbackEnabled, setFallbackEnabled] = useState(aiConfig.gpt4oFallback.enabled);
  const [fallbackThreshold, setFallbackThreshold] = useState(aiConfig.gpt4oFallback.triggerThreshold);
  const [responseVerbosity, setResponseVerbosity] = useState(aiConfig.responseVerbosity);

  // UI state
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [testingClaude, setTestingClaude] = useState(false);
  const [testingGpt4o, setTestingGpt4o] = useState(false);

  // ── Handlers ───────────────────────

  const handleTestConnection = async (engine: 'claude' | 'gpt4o') => {
    const setTesting = engine === 'claude' ? setTestingClaude : setTestingGpt4o;
    setTesting(true);
    try {
      const result = await testConnection(engine);
      if (result.success) {
        toast.success(`${engine === 'claude' ? 'Claude' : 'GPT-4o'} connected (${result.latencyMs}ms)`);
      } else {
        toast.error(result.error || `${engine} connection failed`);
      }
    } catch {
      toast.error(`Failed to test ${engine} connection`);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAll = () => {
    updateAIConfig({
      primaryEngine,
      claudeModel,
      gpt4oModel,
      claudeApiKey,
      openaiApiKey,
      confidenceThreshold,
      tokenBudgetPerQuery,
      temperature,
      gpt4oFallback: { enabled: fallbackEnabled, triggerThreshold: fallbackThreshold },
      responseVerbosity,
    });
    toast.success('AI configuration saved');
  };

  // ── Cost tracking (read-only from store) ──

  const tokensUsed = aiConfig.costTracking.tokensUsed;
  const estimatedCost = aiConfig.costTracking.estimatedCost;
  const monthlyBudget = aiConfig.costTracking.monthlyBudget;
  const budgetPercent = monthlyBudget > 0 ? Math.min((estimatedCost / monthlyBudget) * 100, 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page title */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">AI Configuration</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Configure AI models, API keys, confidence thresholds, and cost tracking.
        </p>
      </div>

      {/* 1. Primary Engine */}
      <Section
        icon={BrainCircuit}
        title="Primary AI Engine"
        description="Choose the default AI engine for all queries."
      >
        <div className="flex gap-4">
          {(['claude', 'gpt4o'] as const).map((engine) => {
            const isSelected = primaryEngine === engine;
            return (
              <button
                key={engine}
                type="button"
                onClick={() => setPrimaryEngine(engine)}
                className={`flex-1 text-left rounded-lg border p-4 transition-all ${
                  isSelected
                    ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-orange-500' : 'border-zinc-300'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                  </div>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-orange-700' : 'text-zinc-700'}`}>
                    {engine === 'claude' ? 'Anthropic Claude' : 'OpenAI GPT-4o'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 2. Claude Config */}
      <Section
        icon={BrainCircuit}
        title="Claude Configuration"
        description="Model selection, API key, and connection test for Claude."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-700">Model</Label>
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value as ClaudeModel)}
              className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              {CLAUDE_MODELS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-700">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => handleTestConnection('claude')}
                disabled={testingClaude}
                className="gap-1.5 min-w-[140px]"
              >
                {testingClaude ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {testingClaude ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. GPT-4o Config */}
      <Section
        icon={BrainCircuit}
        title="GPT-4o Configuration"
        description="Model selection, API key, and connection test for OpenAI."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-700">Model</Label>
            <select
              value={gpt4oModel}
              onChange={(e) => setGpt4oModel(e.target.value as GPT4oModel)}
              className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              {GPT4O_MODELS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-700">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => handleTestConnection('gpt4o')}
                disabled={testingGpt4o}
                className="gap-1.5 min-w-[140px]"
              >
                {testingGpt4o ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {testingGpt4o ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* 4. Confidence Threshold */}
      <Section
        icon={SlidersHorizontal}
        title="Confidence Threshold"
        description="Minimum confidence level required before AI results are accepted without manual review."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0.50}
              max={0.99}
              step={0.01}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="text-lg font-bold text-zinc-900 w-16 text-right">
              {confidenceThreshold.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>0.50 (lenient)</span>
            <span>0.99 (strict)</span>
          </div>
        </div>
      </Section>

      {/* 5. GPT-4o Fallback */}
      <Section
        icon={ToggleLeft}
        title="GPT-4o Fallback"
        description="Enable a secondary AI model that activates when Claude's confidence drops below the threshold."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">Enable Fallback</p>
              <p className="text-xs text-zinc-500">
                Automatically route to GPT-4o when primary model confidence is low.
              </p>
            </div>
            <Switch
              checked={fallbackEnabled}
              onCheckedChange={setFallbackEnabled}
            />
          </div>

          {fallbackEnabled && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">
                Trigger Threshold (%)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={fallbackThreshold}
                  onChange={(e) => setFallbackThreshold(Number(e.target.value))}
                  className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <span className="text-sm font-semibold text-zinc-900 w-12 text-right">
                  {fallbackThreshold}%
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Fallback triggers when model confidence variance exceeds this percentage.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* 6. Token Budget per Query */}
      <Section
        icon={Zap}
        title="Token Budget per Query"
        description="Maximum tokens allocated per individual AI query (1,000 - 8,000)."
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1000}
              max={8000}
              step={100}
              value={tokenBudgetPerQuery}
              onChange={(e) => setTokenBudgetPerQuery(Number(e.target.value))}
              className="w-40 font-mono"
            />
            <span className="text-sm text-zinc-500">tokens</span>
          </div>
          <p className="text-xs text-zinc-400">
            {(tokenBudgetPerQuery / 1000).toFixed(1)}K tokens per query
          </p>
        </div>
      </Section>

      {/* 7. Temperature */}
      <Section
        icon={SlidersHorizontal}
        title="Temperature"
        description="Controls randomness in AI responses. Lower = more deterministic, higher = more creative."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={1.0}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <span className="text-lg font-bold text-zinc-900 w-12 text-right">
              {temperature.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>0.0 (precise)</span>
            <span>1.0 (creative)</span>
          </div>
        </div>
      </Section>

      {/* 8. Response Verbosity */}
      <Section
        icon={MessageSquare}
        title="Response Verbosity"
        description="Control the depth and detail level of AI responses across the platform."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {VERBOSITY_OPTIONS.map(({ value, label, description }) => {
            const isSelected = responseVerbosity === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setResponseVerbosity(value)}
                className={`text-left rounded-lg border p-4 transition-all ${
                  isSelected
                    ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-orange-500' : 'border-zinc-300'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-orange-700' : 'text-zinc-700'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 ml-6">{description}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 9. Cost Tracking */}
      <Section
        icon={DollarSign}
        title="Cost Tracking Dashboard"
        description="Monitor AI token usage and spending against your monthly budget."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Tokens Used */}
          <Card className="border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Tokens Used
              </span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">
              {tokensUsed.toLocaleString()}
            </p>
          </Card>

          {/* Estimated Cost */}
          <Card className="border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Estimated Cost
              </span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">
              ${estimatedCost.toFixed(2)}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>of ${monthlyBudget.toFixed(2)} budget</span>
                <span>{budgetPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetPercent > 80 ? 'bg-red-500' : budgetPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Monthly Budget */}
          <Card className="border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Monthly Budget
              </span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">
              ${monthlyBudget.toFixed(2)}
            </p>
            <p className="text-xs text-zinc-400 mt-2">
              ${(monthlyBudget - estimatedCost).toFixed(2)} remaining this period
            </p>
          </Card>
        </div>
      </Section>

      {/* 10. Save All */}
      <div className="flex justify-end pt-2 pb-4">
        <Button
          onClick={handleSaveAll}
          className="bg-orange-600 hover:bg-orange-700 text-white px-8"
        >
          Save All
        </Button>
      </div>
    </div>
  );
}
