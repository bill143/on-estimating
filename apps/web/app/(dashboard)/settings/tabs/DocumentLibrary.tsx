'''use client''';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Save,
  Building2,
  LayoutTemplate,
  Settings2,
  Droplets,
} from 'lucide-react';
import { useSettingsStore } from '@/lib/settings-store';
import toast from 'react-hot-toast';

// ── Page-size aspect ratios (w:h) for preview ──

const PAGE_ASPECTS: Record<string, { w: number; h: number }> = {
  letter: { w: 8.5, h: 11 },
  legal: { w: 8.5, h: 14 },
  a4: { w: 8.27, h: 11.69 },
};

// ── Main component ─────────────────────

export default function DocumentLibrary() {
  const exportTemplates = useSettingsStore((s) => s.exportTemplates);
  const updateExportTemplates = useSettingsStore((s) => s.updateExportTemplates);

  const {
    companyName,
    logoPlaceholder,
    addressBlock,
    coverPage,
    includeCsiBreakdown,
    includeAIConfidence,
    includeMarkupDetail,
    pageSize,
    fontSize,
    draftWatermark,
  } = exportTemplates;

  const handleSave = () => {
    updateExportTemplates(exportTemplates);
    toast.success('Export template settings saved');
  };

  // Preview dimensions
  const aspect = PAGE_ASPECTS[pageSize] ?? PAGE_ASPECTS.letter;
  const previewHeight = 360;
  const previewWidth = Math.round(previewHeight * (aspect.w / aspect.h));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Export Templates</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Configure how exported estimates look -- letterhead, content sections, and formatting.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left column: form ── */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* 1. Letterhead */}
          <Card className="border border-zinc-200 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Letterhead</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => updateExportTemplates({ companyName: e.target.value })}
                  placeholder="Acme Federal Contractors, LLC"
                  className="focus-visible:ring-orange-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">Address Block</Label>
                <textarea
                  value={addressBlock}
                  onChange={(e) => updateExportTemplates({ addressBlock: e.target.value })}
                  placeholder={"123 Main Street\nSuite 400\nWashington, DC 20001"}
                  rows={3}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-zinc-700">Logo Placeholder</Label>
                  <p className="text-xs text-zinc-500">Show a placeholder box for the company logo</p>
                </div>
                <Switch
                  checked={logoPlaceholder}
                  onCheckedChange={(v) => updateExportTemplates({ logoPlaceholder: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Content */}
          <Card className="border border-zinc-200 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Content</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-medium text-zinc-700">Cover Page</Label>
                  <p className="text-xs text-zinc-500">Include a title/cover page in exports</p>
                </div>
                <Switch
                  checked={coverPage}
                  onCheckedChange={(v) => updateExportTemplates({ coverPage: v })}
                />
              </div>
              <div className="border-t border-zinc-100" />
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-medium text-zinc-700">AI Confidence Scores</Label>
                  <p className="text-xs text-zinc-500">Show AI confidence percentages on line items</p>
                </div>
                <Switch
                  checked={includeAIConfidence}
                  onCheckedChange={(v) => updateExportTemplates({ includeAIConfidence: v })}
                />
              </div>
              <div className="border-t border-zinc-100" />
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-medium text-zinc-700">CSI Breakdown</Label>
                  <p className="text-xs text-zinc-500">Include CSI division cost breakdown table</p>
                </div>
                <Switch
                  checked={includeCsiBreakdown}
                  onCheckedChange={(v) => updateExportTemplates({ includeCsiBreakdown: v })}
                />
              </div>
              <div className="border-t border-zinc-100" />
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm font-medium text-zinc-700">Markup Detail</Label>
                  <p className="text-xs text-zinc-500">Show overhead, profit, and bond markup lines</p>
                </div>
                <Switch
                  checked={includeMarkupDetail}
                  onCheckedChange={(v) => updateExportTemplates({ includeMarkupDetail: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Format */}
          <Card className="border border-zinc-200 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <Settings2 className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Format</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Page size radio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700">Page Size</Label>
                <div className="flex gap-3">
                  {([
                    { value: 'letter', label: 'Letter (8.5x11)' },
                    { value: 'legal', label: 'Legal (8.5x14)' },
                    { value: 'a4', label: 'A4' },
                  ] as const).map((opt) => {
                    const isSelected = pageSize === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          updateExportTemplates({ pageSize: opt.value })
                        }
                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font size radio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700">Font Size</Label>
                <div className="flex gap-3">
                  {([10, 11, 12] as const).map((size) => {
                    const isSelected = fontSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          updateExportTemplates({ fontSize: size })
                        }
                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        {size}pt
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Watermark */}
          <Card className="border border-zinc-200 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <Droplets className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Watermark</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">Draft Watermark Text</Label>
                <Input
                  value={draftWatermark}
                  onChange={(e) => updateExportTemplates({ draftWatermark: e.target.value })}
                  placeholder="DRAFT"
                  className="focus-visible:ring-orange-500/20 max-w-xs"
                />
                <p className="text-xs text-zinc-500">Leave blank to disable watermark</p>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 px-6"
            >
              <Save className="w-4 h-4" />
              Save Template Settings
            </Button>
          </div>
        </div>

        {/* ── Right column: live preview (280px) ── */}
        <div className="hidden lg:block sticky top-4" style={{ width: 280 }}>
          <Label className="text-sm font-medium text-zinc-700 mb-2 block">Live Preview</Label>
          <div
            className="bg-white border border-zinc-300 rounded-md shadow-lg overflow-hidden"
            style={{
              width: previewWidth > 280 ? 280 : previewWidth,
              height: previewHeight,
              position: 'relative',
            }}
          >
            {/* Watermark */}
            {draftWatermark && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ zIndex: 1 }}
              >
                <span
                  className="text-zinc-200 font-bold uppercase select-none"
                  style={{
                    fontSize: '2rem',
                    transform: 'rotate(-35deg)',
                    letterSpacing: '0.2em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {draftWatermark}
                </span>
              </div>
            )}

            <div className="relative z-10 p-3 h-full flex flex-col" style={{ fontSize: `${fontSize * 0.6}px` }}>
              {/* Letterhead area */}
              {(companyName || addressBlock || logoPlaceholder) && (
                <div className="mb-2 pb-2 border-b border-zinc-200">
                  <div className="flex items-start gap-2">
                    {logoPlaceholder && (
                      <div className="w-6 h-6 border border-dashed border-zinc-300 rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3 h-3 text-zinc-300" />
                      </div>
                    )}
                    <div className="min-w-0">
                      {companyName && (
                        <p className="font-bold text-zinc-900 truncate" style={{ fontSize: `${fontSize * 0.7}px` }}>
                          {companyName}
                        </p>
                      )}
                      {addressBlock && (
                        <p className="text-zinc-500 whitespace-pre-line leading-tight mt-0.5" style={{ fontSize: `${fontSize * 0.5}px` }}>
                          {addressBlock}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cover page indicator */}
              {coverPage && (
                <div className="flex items-center justify-center py-4 mb-2 border border-dashed border-zinc-200 rounded bg-zinc-50">
                  <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">
                    Estimate Cover Page
                  </span>
                </div>
              )}

              {/* CSI Breakdown table */}
              {includeCsiBreakdown && (
                <div className="mb-2">
                  <p className="text-[8px] font-semibold text-zinc-600 uppercase mb-1">CSI Breakdown</p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left text-[7px] text-zinc-500 pb-0.5">Division</th>
                        <th className="text-right text-[7px] text-zinc-500 pb-0.5">Cost</th>
                        {includeAIConfidence && (
                          <th className="text-right text-[7px] text-zinc-500 pb-0.5">AI</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { div: '03 - Concrete', cost: '$142,800' },
                        { div: '05 - Metals', cost: '$98,200' },
                        { div: '09 - Finishes', cost: '$67,500' },
                      ].map((row) => (
                        <tr key={row.div} className="border-b border-zinc-100">
                          <td className="text-[7px] text-zinc-700 py-0.5">{row.div}</td>
                          <td className="text-[7px] text-zinc-700 py-0.5 text-right">{row.cost}</td>
                          {includeAIConfidence && (
                            <td className="text-right py-0.5">
                              <Badge className="bg-green-100 text-green-700 text-[6px] px-1 py-0 border-0">
                                92%
                              </Badge>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AI Confidence pill (standalone when no CSI table) */}
              {includeAIConfidence && !includeCsiBreakdown && (
                <div className="mb-2 flex items-center gap-1">
                  <span className="text-[8px] text-zinc-500">AI Confidence:</span>
                  <Badge className="bg-green-100 text-green-700 text-[7px] px-1.5 py-0 border-0">
                    92%
                  </Badge>
                </div>
              )}

              {/* Markup detail lines */}
              {includeMarkupDetail && (
                <div className="mb-2 space-y-0.5">
                  <p className="text-[8px] font-semibold text-zinc-600 uppercase mb-0.5">Markup</p>
                  {[
                    { label: 'Overhead', pct: '10%', amt: '$30,850' },
                    { label: 'Profit', pct: '8%', amt: '$24,680' },
                    { label: 'Bond', pct: '2.5%', amt: '$7,713' },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-[7px] text-zinc-600">{m.label} ({m.pct})</span>
                      <span className="text-[7px] text-zinc-700 font-medium">{m.amt}</span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-300 mt-1 pt-0.5 flex items-center justify-between">
                    <span className="text-[7px] font-bold text-zinc-800">Total</span>
                    <span className="text-[7px] font-bold text-zinc-900">$371,743</span>
                  </div>
                </div>
              )}

              {/* Footer spacer */}
              <div className="flex-1" />
              <div className="border-t border-zinc-200 pt-1 text-center">
                <span className="text-[6px] text-zinc-400">
                  {pageSize.toUpperCase()} | {fontSize}pt | Page 1 of 1
                </span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 text-center">
            Preview updates as you change settings
          </p>
        </div>
      </div>
    </div>
  );
}
