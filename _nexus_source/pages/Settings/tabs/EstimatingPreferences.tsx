import { useState } from 'react';
import {
  ListChecks,
  HardHat,
  Percent,
  Ruler,
  FileOutput,
  Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/settingsStore';
import type { CSIDivision } from '@/types/settings';

// ── CSI MasterFormat Divisions ─────────

const CSI_DIVISIONS: CSIDivision[] = [
  { code: '01', name: 'General Requirements', enabled: true },
  { code: '02', name: 'Existing Conditions', enabled: true },
  { code: '03', name: 'Concrete', enabled: true },
  { code: '04', name: 'Masonry', enabled: true },
  { code: '05', name: 'Metals', enabled: true },
  { code: '06', name: 'Wood, Plastics, and Composites', enabled: true },
  { code: '07', name: 'Thermal and Moisture Protection', enabled: true },
  { code: '08', name: 'Openings', enabled: true },
  { code: '09', name: 'Finishes', enabled: true },
  { code: '10', name: 'Specialties', enabled: true },
  { code: '11', name: 'Equipment', enabled: true },
  { code: '12', name: 'Furnishings', enabled: true },
  { code: '13', name: 'Special Construction', enabled: true },
  { code: '14', name: 'Conveying Equipment', enabled: true },
  { code: '21', name: 'Fire Suppression', enabled: true },
  { code: '22', name: 'Plumbing', enabled: true },
  { code: '23', name: 'HVAC', enabled: true },
  { code: '25', name: 'Integrated Automation', enabled: false },
  { code: '26', name: 'Electrical', enabled: true },
  { code: '27', name: 'Communications', enabled: true },
  { code: '28', name: 'Electronic Safety and Security', enabled: true },
  { code: '31', name: 'Earthwork', enabled: true },
];

// ── Project type keys ──────────────────

const PROJECT_TYPES: { key: string; label: string }[] = [
  { key: 'design-build', label: 'Design-Build' },
  { key: 'bid-build', label: 'Bid-Build' },
  { key: 'idiq', label: 'IDIQ' },
];

// ── Section wrapper ────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-zinc-200 bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-zinc-900">{title}</CardTitle>
            <p className="text-xs text-zinc-500">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────

export default function EstimatingPreferences() {
  const estimating = useSettingsStore((s) => s.estimating);
  const updateEstimating = useSettingsStore((s) => s.updateEstimating);

  // Initialize CSI divisions from store or defaults
  const csiDivisions = estimating.csiDivisions.length > 0 ? estimating.csiDivisions : CSI_DIVISIONS;

  // Local state for form fields (persisted on Save)
  const [overheadDefaults, setOverheadDefaults] = useState<Record<string, number>>(
    estimating.overheadProfitDefaults,
  );
  const [contingencyDefaults, setContingencyDefaults] = useState<Record<string, number>>(
    estimating.contingencyDefaults,
  );
  const [burdenRate, setBurdenRate] = useState(35); // labor burden default
  const [salesTax, setSalesTax] = useState(6.0);     // sales tax default
  const [unitOfMeasure, setUnitOfMeasure] = useState(estimating.unitOfMeasure);
  const [exportFormat, setExportFormat] = useState(estimating.defaultExportFormat);
  const [roundingQuantities, setRoundingQuantities] = useState(estimating.roundingRules.quantities);
  const [roundingCosts, setRoundingCosts] = useState(estimating.roundingRules.costs);
  const [roundingTotals, setRoundingTotals] = useState(estimating.roundingRules.totals);

  // ── CSI Division handlers ──

  function toggleDivision(code: string) {
    const updated = csiDivisions.map((d) =>
      d.code === code ? { ...d, enabled: !d.enabled } : d,
    );
    updateEstimating({ csiDivisions: updated });
    const div = updated.find((d) => d.code === code);
    toast.success(`Div ${code} ${div?.enabled ? 'enabled' : 'disabled'}`);
  }

  function enableAllDivisions() {
    updateEstimating({ csiDivisions: csiDivisions.map((d) => ({ ...d, enabled: true })) });
    toast.success('All CSI divisions enabled');
  }

  function disableAllDivisions() {
    updateEstimating({ csiDivisions: csiDivisions.map((d) => ({ ...d, enabled: false })) });
    toast.success('All CSI divisions disabled');
  }

  // ── Save handler ──

  function handleSave() {
    updateEstimating({
      overheadProfitDefaults: overheadDefaults,
      contingencyDefaults: contingencyDefaults,
      unitOfMeasure,
      defaultExportFormat: exportFormat,
      roundingRules: {
        quantities: roundingQuantities,
        costs: roundingCosts,
        totals: roundingTotals,
      },
    });
    toast.success('Estimating preferences saved');
  }

  // ── Render ──

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Estimating Preferences</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Configure markup defaults, CSI divisions, units, and export settings.
        </p>
      </div>

      {/* ━━ 1. Markup Defaults ━━ */}
      <Section
        icon={Percent}
        title="Markup Defaults"
        description="Overhead %, profit %, bond %, and contingency % by project delivery type"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-2 pr-4 font-medium text-zinc-600">Project Type</th>
                <th className="text-center py-2 px-3 font-medium text-zinc-600">Overhead %</th>
                <th className="text-center py-2 px-3 font-medium text-zinc-600">Profit %</th>
                <th className="text-center py-2 px-3 font-medium text-zinc-600">Contingency %</th>
              </tr>
            </thead>
            <tbody>
              {PROJECT_TYPES.map(({ key, label }) => (
                <tr key={key} className="border-b border-zinc-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-zinc-900">{label}</td>
                  <td className="py-3 px-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={overheadDefaults[key] ?? 0}
                      onChange={(e) =>
                        setOverheadDefaults((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="w-20 text-center mx-auto"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={overheadDefaults[`${key}-profit`] ?? 0}
                      onChange={(e) =>
                        setOverheadDefaults((prev) => ({
                          ...prev,
                          [`${key}-profit`]: Number(e.target.value),
                        }))
                      }
                      className="w-20 text-center mx-auto"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={contingencyDefaults[key] ?? 0}
                      onChange={(e) =>
                        setContingencyDefaults((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="w-20 text-center mx-auto"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ━━ 2. Labor Burden & Tax ━━ */}
      <Section
        icon={HardHat}
        title="Labor Burden & Tax"
        description="Default labor burden rate and sales tax percentage"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="burden-rate">Labor Burden Rate (%)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="burden-rate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={burdenRate}
                onChange={(e) => setBurdenRate(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-sm text-zinc-500">%</span>
            </div>
          </div>
          <div>
            <Label htmlFor="sales-tax">Sales Tax (%)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="sales-tax"
                type="number"
                min={0}
                max={20}
                step={0.25}
                value={salesTax}
                onChange={(e) => setSalesTax(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-sm text-zinc-500">%</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ━━ 3. Unit of Measure ━━ */}
      <Section
        icon={Ruler}
        title="Unit of Measure"
        description="Default measurement system for all estimates"
      >
        <div className="flex gap-4">
          {(['imperial', 'metric'] as const).map((unit) => {
            const isSelected = unitOfMeasure === unit;
            return (
              <button
                key={unit}
                type="button"
                onClick={() => setUnitOfMeasure(unit)}
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
                  <span className={`text-sm font-semibold capitalize ${isSelected ? 'text-orange-700' : 'text-zinc-700'}`}>
                    {unit}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 ml-6 mt-1">
                  {unit === 'imperial' ? 'Feet, inches, pounds, gallons' : 'Meters, kilograms, liters'}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ━━ 4. CSI Division Toggles ━━ */}
      <Section
        icon={ListChecks}
        title="CSI MasterFormat Divisions"
        description="Enable or disable standard CSI divisions for your estimates"
      >
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={enableAllDivisions}>
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={disableAllDivisions}>
            Disable All
          </Button>
          <span className="ml-auto text-xs text-zinc-500">
            {csiDivisions.filter((d) => d.enabled).length} of {csiDivisions.length} enabled
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {csiDivisions.map((div) => (
            <div
              key={div.code}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                div.enabled
                  ? 'border-orange-200 bg-orange-50/40'
                  : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${
                    div.enabled
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-zinc-200 text-zinc-500'
                  }`}
                >
                  {div.code}
                </span>
                <span className="text-sm text-zinc-800 truncate">{div.name}</span>
              </div>
              <Switch
                checked={div.enabled}
                onCheckedChange={() => toggleDivision(div.code)}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ━━ 5. Export Format ━━ */}
      <Section
        icon={FileOutput}
        title="Default Export Format"
        description="Choose the default file format when exporting estimates"
      >
        <div className="flex gap-4">
          {([
            { value: 'pdf' as const, label: 'PDF', desc: 'Portable Document Format' },
            { value: 'excel' as const, label: 'Excel', desc: 'Microsoft Excel (.xlsx)' },
            { value: 'both' as const, label: 'Both', desc: 'Generate PDF and Excel' },
          ]).map(({ value, label, desc }) => {
            const isSelected = exportFormat === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setExportFormat(value)}
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
                    {label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 ml-6 mt-1">{desc}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ━━ 6. Rounding Rules ━━ */}
      <Section
        icon={Hash}
        title="Rounding Rules"
        description="Decimal places for quantities, unit costs, and line totals"
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="round-qty">Quantities (decimal places)</Label>
            <Input
              id="round-qty"
              type="number"
              min={0}
              max={6}
              value={roundingQuantities}
              onChange={(e) => setRoundingQuantities(Number(e.target.value))}
              className="mt-1 w-20"
            />
          </div>
          <div>
            <Label htmlFor="round-cost">Costs (decimal places)</Label>
            <Input
              id="round-cost"
              type="number"
              min={0}
              max={6}
              value={roundingCosts}
              onChange={(e) => setRoundingCosts(Number(e.target.value))}
              className="mt-1 w-20"
            />
          </div>
          <div>
            <Label htmlFor="round-total">Totals (decimal places)</Label>
            <Input
              id="round-total"
              type="number"
              min={0}
              max={6}
              value={roundingTotals}
              onChange={(e) => setRoundingTotals(Number(e.target.value))}
              className="mt-1 w-20"
            />
          </div>
        </div>
      </Section>

      {/* ━━ Save Button ━━ */}
      <div className="flex justify-end pt-2 pb-4">
        <Button
          onClick={handleSave}
          className="bg-orange-600 hover:bg-orange-700 text-white px-8"
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
