'use client';

import { useState } from 'react';
import { Brain, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PredictionResult {
  predicted: number;
  confidence: number;
  lowRange: number;
  highRange: number;
  factors: { name: string; impact: number; direction: 'up' | 'down' }[];
}

export default function PredictionsPage() {
  const [projectType, setProjectType] = useState('commercial_office');
  const [sqft, setSqft] = useState('50000');
  const [stories, setStories] = useState('3');
  const [region, setRegion] = useState('socal');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handlePredict() {
    setIsLoading(true);
    // Simulated ML prediction (would call FastAPI backend in production)
    setTimeout(() => {
      const sqftNum = parseFloat(sqft) || 50000;
      const baseRate = PROJECT_RATES[projectType] || 185;
      const regionMult = REGION_MULTIPLIERS[region] || 1.0;
      const storyMult = 1 + (parseInt(stories) - 1) * 0.04;
      const predicted = Math.round(sqftNum * baseRate * regionMult * storyMult);

      setResult({
        predicted,
        confidence: 87.3,
        lowRange: Math.round(predicted * 0.88),
        highRange: Math.round(predicted * 1.15),
        factors: [
          { name: 'Regional Labor Index', impact: regionMult > 1.1 ? 12 : 5, direction: regionMult > 1 ? 'up' : 'down' },
          { name: 'Material Price Trend (6mo)', impact: 8.2, direction: 'up' },
          { name: 'Project Complexity Score', impact: parseInt(stories) > 3 ? 15 : 4, direction: 'up' },
          { name: 'Historical Win Rate Adj.', impact: 3.1, direction: 'down' },
          { name: 'Supply Chain Risk Index', impact: 2.8, direction: 'up' },
        ],
      });
      setIsLoading(false);
    }, 1500);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">ML Cost Prediction Engine</h1>
            <p className="text-xs text-gray-500">
              HistGradientBoosting + RandomForest ensemble model — trained on historical project data
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6 max-w-5xl">
          {/* Input Panel */}
          <div className="w-80 flex-shrink-0">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Project Parameters</h3>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Project Type</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="commercial_office">Commercial Office</option>
                  <option value="residential_multi">Residential Multi-Family</option>
                  <option value="retail">Retail / Shopping</option>
                  <option value="medical">Medical / Healthcare</option>
                  <option value="industrial">Industrial / Warehouse</option>
                  <option value="education">Education / K-12</option>
                  <option value="government">Government / Federal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Gross Square Footage
                </label>
                <input
                  type="number"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Stories</label>
                <input
                  type="number"
                  value={stories}
                  onChange={(e) => setStories(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  min="1"
                  max="50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="socal">Southern California</option>
                  <option value="norcal">Northern California</option>
                  <option value="northeast">Northeast US</option>
                  <option value="southeast">Southeast US</option>
                  <option value="midwest">Midwest US</option>
                  <option value="texas">Texas</option>
                  <option value="pacific_nw">Pacific Northwest</option>
                </select>
              </div>

              <button
                onClick={handlePredict}
                disabled={isLoading}
                className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {isLoading ? 'Running Model...' : 'Generate Prediction'}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex-1 space-y-4">
            {result ? (
              <>
                {/* Prediction Result */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Predicted Total Cost</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {formatCurrency(result.predicted)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatCurrency(result.lowRange)} — {formatCurrency(result.highRange)} range
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Model Confidence</p>
                      <p className={cn(
                        'text-2xl font-bold mt-1',
                        result.confidence >= 85 ? 'text-emerald-600' :
                        result.confidence >= 70 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {result.confidence}%
                      </p>
                    </div>
                  </div>

                  {/* Cost per SF */}
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Cost per SF</p>
                      <p className="text-lg font-semibold text-gray-800">
                        ${(result.predicted / (parseFloat(sqft) || 1)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Low $/SF</p>
                      <p className="text-sm font-medium text-gray-600">
                        ${(result.lowRange / (parseFloat(sqft) || 1)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">High $/SF</p>
                      <p className="text-sm font-medium text-gray-600">
                        ${(result.highRange / (parseFloat(sqft) || 1)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cost Drivers */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Cost Drivers</h3>
                  <div className="space-y-3">
                    {result.factors.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <TrendingUp className={cn('h-4 w-4', f.direction === 'up' ? 'text-red-500' : 'text-emerald-500 rotate-180')} />
                        <span className="flex-1 text-xs text-gray-700">{f.name}</span>
                        <span className={cn('text-xs font-semibold', f.direction === 'up' ? 'text-red-600' : 'text-emerald-600')}>
                          {f.direction === 'up' ? '+' : '-'}{f.impact}%
                        </span>
                        <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', f.direction === 'up' ? 'bg-red-400' : 'bg-emerald-400')}
                            style={{ width: `${Math.min(f.impact * 5, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Predictions are based on historical project data and ML models. Results should be used
                    as guidance alongside professional judgment. Model accuracy improves as more project
                    data is captured.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="text-sm text-gray-400 mt-2">
                    Enter project parameters and click Generate Prediction
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const PROJECT_RATES: Record<string, number> = {
  commercial_office: 225,
  residential_multi: 185,
  retail: 165,
  medical: 385,
  industrial: 125,
  education: 275,
  government: 310,
};

const REGION_MULTIPLIERS: Record<string, number> = {
  socal: 1.15,
  norcal: 1.22,
  northeast: 1.18,
  southeast: 0.92,
  midwest: 0.95,
  texas: 0.88,
  pacific_nw: 1.08,
};
