'use client';

import { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Hash,
  MessageSquare,
  Sigma,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  useEstimateStore,
  type Option,
  type EstimateRow,
  type RowType,
  UNITS,
} from '@/lib/estimate-store';
import { formatCurrencyDetailed, cn } from '@/lib/utils';

export function OptionsTab() {
  const { options, addOption, removeOption } = useEstimateStore();

  return (
    <div className="space-y-6">
      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-gray-500 mb-4">
            No options defined. Options are self-contained mini-estimates for add/deduct scope items.
          </p>
          <button
            onClick={addOption}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add First Option
          </button>
        </div>
      ) : (
        <>
          {options.map((option) => (
            <OptionCard key={option.id} option={option} onRemove={() => removeOption(option.id)} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={addOption}
              className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-6 py-3 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Option
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function OptionCard({ option, onRemove }: { option: Option; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<'items' | 'gr' | 'gc'>('items');
  const { updateOptionMeta } = useEstimateStore();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Option Header */}
      <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-white shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <select
            value={option.optionType}
            onChange={(e) => updateOptionMeta(option.id, { optionType: e.target.value as 'add' | 'deduct' | 'alternate' })}
            className={cn(
              'text-[9px] font-black uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 cursor-pointer focus:outline-none',
              option.optionType === 'add' && 'bg-emerald-600 text-white',
              option.optionType === 'deduct' && 'bg-red-600 text-white',
              option.optionType === 'alternate' && 'bg-amber-500 text-white',
            )}
          >
            <option value="add">ADD</option>
            <option value="deduct">DEDUCT</option>
            <option value="alternate">ALT</option>
          </select>
          <input
            type="text"
            value={option.name}
            onChange={(e) => updateOptionMeta(option.id, { name: e.target.value })}
            className="bg-transparent text-sm font-bold text-white focus:outline-none focus:bg-gray-800 rounded px-1 min-w-0"
            placeholder="Option Name"
          />
          <span className="text-gray-500 mx-1">—</span>
          <input
            type="text"
            value={option.description}
            onChange={(e) => updateOptionMeta(option.id, { description: e.target.value })}
            className="bg-transparent text-sm text-gray-300 focus:outline-none focus:bg-gray-800 rounded px-1 flex-1 min-w-0"
            placeholder="Description"
          />
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className={cn(
            'text-sm font-black tabular-nums',
            option.optionType === 'deduct' ? 'text-red-400' : 'text-emerald-400',
          )}>
            {option.optionType === 'deduct' && '−'}{formatCurrencyDetailed(option.totalOptionCost)}
          </span>
          <button onClick={onRemove} className="text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div>
          {/* Section Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {(['items', 'gr', 'gc'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  'px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors',
                  activeSection === section
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                )}
              >
                {section === 'items' ? 'Line Items' : section === 'gr' ? 'Gen. Requirements' : 'Gen. Conditions'}
              </button>
            ))}
            {/* Rate inputs */}
            <div className="ml-auto flex items-center gap-3 px-4 text-[10px] text-gray-400">
              <RateInput label="Burden" value={option.laborBurdenPercent} onChange={(v) => updateOptionMeta(option.id, { laborBurdenPercent: v })} />
              <RateInput label="OH" value={option.overheadPercent} onChange={(v) => updateOptionMeta(option.id, { overheadPercent: v })} />
              <RateInput label="Profit" value={option.profitPercent} onChange={(v) => updateOptionMeta(option.id, { profitPercent: v })} />
              <RateInput label="Bond" value={option.bondPercent} onChange={(v) => updateOptionMeta(option.id, { bondPercent: v })} />
              <RateInput label="Ins" value={option.insurancePercent} onChange={(v) => updateOptionMeta(option.id, { insurancePercent: v })} />
              <RateInput label="Conting" value={option.contingencyPercent} onChange={(v) => updateOptionMeta(option.id, { contingencyPercent: v })} />
              <RateInput label="Tax" value={option.taxPercent} onChange={(v) => updateOptionMeta(option.id, { taxPercent: v })} />
            </div>
          </div>

          {/* Section Content */}
          <div className="p-4">
            {activeSection === 'items' && <OptionLineItems optionId={option.id} rows={option.rows} />}
            {activeSection === 'gr' && <OptionGR optionId={option.id} rows={option.generalRequirementsRows} subtotal={option.genRequirementsSubtotal} />}
            {activeSection === 'gc' && <OptionGC optionId={option.id} rows={option.generalConditionsRows} subtotal={option.genConditionsSubtotal} />}
          </div>

          {/* Option Cost Summary */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Direct: {formatCurrencyDetailed(option.directCostSubtotal)}</span>
              {option.laborBurdenAmount > 0 && <span>Burden: {formatCurrencyDetailed(option.laborBurdenAmount)}</span>}
              <span>OH: {formatCurrencyDetailed(option.overheadAmount)}</span>
              <span>Profit: {formatCurrencyDetailed(option.profitAmount)}</span>
              <span>Bond: {formatCurrencyDetailed(option.bondAmount)}</span>
              <span>Ins: {formatCurrencyDetailed(option.insuranceAmount)}</span>
              {option.contingencyAmount > 0 && <span>Conting: {formatCurrencyDetailed(option.contingencyAmount)}</span>}
              {option.taxAmount > 0 && <span>Tax: {formatCurrencyDetailed(option.taxAmount)}</span>}
              <span className="font-black text-gray-900">Total: {formatCurrencyDetailed(option.totalOptionCost)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RateInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-12 bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] text-right font-mono tabular-nums focus:outline-none focus:border-brand-400"
        step="0.25"
      />
      <span>%</span>
    </div>
  );
}

// ─── Option Line Items Grid ──────────────────────────────────────────────

const GRID_COLS = 'grid-cols-[40px_64px_64px_80px_1fr_72px_56px_80px_56px_80px_80px_80px_80px_96px_96px_36px]';

function OptionLineItems({ optionId, rows }: { optionId: string; rows: EstimateRow[] }) {
  const { addOptionRow, updateOptionRow, removeOptionRow, toggleOptionExpand, moveOptionRow } = useEstimateStore();

  const visibleRows = getVisibleRows(rows);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Column Headers */}
      <div className={cn('grid gap-0 border-b-2 border-gray-300 bg-gray-100 text-[8px] font-bold uppercase tracking-wider text-gray-500', GRID_COLS)}>
        <div className="px-1 py-1.5 text-center">SR#</div>
        <div className="px-1 py-1.5 border-l border-gray-200">Sheet</div>
        <div className="px-1 py-1.5 border-l border-gray-200">Detail</div>
        <div className="px-1 py-1.5 border-l border-gray-200">CSI</div>
        <div className="px-1 py-1.5 border-l border-gray-200">Description</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">QTY</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">W%</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">QTY W/W</div>
        <div className="px-1 py-1.5 text-center border-l border-gray-200">Unit</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Mat$/U</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Lab$/U</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Eq$/U</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Tot$/U</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Total</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Sub Tot</div>
        <div className="border-l border-gray-200" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {visibleRows.map((row) => (
          <OptionGridRow
            key={row.id}
            row={row}
            optionId={optionId}
            onUpdate={(updates) => updateOptionRow(optionId, row.id, updates)}
            onRemove={() => removeOptionRow(optionId, row.id)}
            onToggle={() => toggleOptionExpand(optionId, row.id)}
            onAddAfter={(type) => addOptionRow(optionId, type, row.id)}
            onMove={(dir) => moveOptionRow(optionId, row.id, dir)}
          />
        ))}
      </div>

      {/* Add Buttons */}
      <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 flex items-center gap-3">
        <MiniAddButton icon={Layers} label="Div" onClick={() => addOptionRow(optionId, 'division_header')} />
        <MiniAddButton icon={Hash} label="Sub" onClick={() => addOptionRow(optionId, 'subsection_header')} />
        <MiniAddButton icon={FileText} label="Item" onClick={() => addOptionRow(optionId, 'line_item')} />
        <MiniAddButton icon={MessageSquare} label="Note" onClick={() => addOptionRow(optionId, 'item_note')} />
        <MiniAddButton icon={Sigma} label="Subtotal" onClick={() => addOptionRow(optionId, 'subtotal')} />
      </div>
    </div>
  );
}

function OptionGridRow({
  row,
  optionId,
  onUpdate,
  onRemove,
  onToggle,
  onAddAfter,
  onMove,
}: {
  row: EstimateRow;
  optionId: string;
  onUpdate: (u: Partial<EstimateRow>) => void;
  onRemove: () => void;
  onToggle: () => void;
  onAddAfter: (type: RowType) => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  if (row.rowType === 'division_header') {
    return (
      <div className="bg-gray-800 text-white group">
        <div className={cn('grid gap-0', GRID_COLS)}>
          <div className="px-1 py-1.5 text-[10px] font-mono text-gray-400 text-center">{row.srNo}</div>
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700 px-1 py-1.5">
            <span className="text-[10px] font-bold text-amber-300 font-mono">{row.csiCode}</span>
          </div>
          <div className="border-l border-gray-700 px-1 py-1.5 flex items-center gap-1">
            <button onClick={onToggle} className="shrink-0">
              {row.isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
            </button>
            <span className="text-[10px] font-bold text-white truncate">{row.description}</span>
          </div>
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700" />
          <div className="border-l border-gray-700 px-1 py-1.5 text-right text-[10px] font-bold text-emerald-400 tabular-nums">
            {row.subTotal > 0 ? formatCurrencyDetailed(row.subTotal) : ''}
          </div>
          <div className="border-l border-gray-700 flex items-center justify-center">
            <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (row.rowType === 'subsection_header') {
    return (
      <div className="bg-blue-50 group">
        <div className={cn('grid gap-0', GRID_COLS)}>
          <div className="px-1 py-1 text-[9px] font-mono text-gray-400 text-center">{row.srNo}</div>
          <div className="border-l border-blue-100" />
          <div className="border-l border-blue-100" />
          <div className="border-l border-blue-100 px-1 py-1">
            <span className="text-[9px] font-semibold text-blue-700 font-mono">{row.csiCode}</span>
          </div>
          <div className="border-l border-blue-100 px-1 py-1 col-span-11">
            <span className="text-[10px] font-semibold text-blue-900 pl-3">{row.description}</span>
          </div>
          <div className="border-l border-blue-100 flex items-center justify-center">
            <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (row.rowType === 'item_note') {
    return (
      <div className="bg-amber-50/50 group">
        <div className={cn('grid gap-0', GRID_COLS)}>
          <div className="px-1 py-1 text-[9px] font-mono text-gray-400 text-center">{row.srNo}</div>
          <div className="border-l border-amber-100" />
          <div className="border-l border-amber-100" />
          <div className="border-l border-amber-100 px-1 py-1">
            <span className="text-[9px] text-amber-600 italic">NOTE</span>
          </div>
          <div className="border-l border-amber-100 px-1 py-1 col-span-11">
            <span className="text-[10px] italic text-amber-800">{row.description}</span>
          </div>
          <div className="border-l border-amber-100 flex items-center justify-center">
            <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (row.rowType === 'subtotal') {
    return (
      <div className="bg-emerald-50 border-t-2 border-emerald-200 group">
        <div className={cn('grid gap-0', GRID_COLS)}>
          <div className="px-1 py-1.5 text-[9px] font-mono text-gray-400 text-center">{row.srNo}</div>
          <div className="border-l border-emerald-100" />
          <div className="border-l border-emerald-100" />
          <div className="border-l border-emerald-100" />
          <div className="border-l border-emerald-100 px-1 py-1.5 col-span-10">
            <span className="text-[10px] font-bold text-emerald-800">{row.description || 'Subtotal'}</span>
          </div>
          <div className="border-l border-emerald-100 px-1 py-1.5 text-right">
            <span className="text-[10px] font-black text-emerald-700 tabular-nums">{formatCurrencyDetailed(row.subTotal)}</span>
          </div>
          <div className="border-l border-emerald-100 flex items-center justify-center">
            <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // line_item
  return (
    <div className="hover:bg-brand-50/20 transition-colors group text-[10px]">
      <div className={cn('grid gap-0', GRID_COLS)}>
        <div className="px-1 py-1 text-[9px] font-mono text-gray-400 text-center flex items-center justify-center">
          <span className="group-hover:hidden">{row.srNo}</span>
          <div className="hidden group-hover:flex flex-col">
            <button onClick={() => onMove('up')} className="text-gray-400 hover:text-gray-600"><ArrowUp className="h-2 w-2" /></button>
            <button onClick={() => onMove('down')} className="text-gray-400 hover:text-gray-600"><ArrowDown className="h-2 w-2" /></button>
          </div>
        </div>
        <MiniCell value={row.sheetNo} onChange={(v) => onUpdate({ sheetNo: v })} />
        <MiniCell value={row.detailNo} onChange={(v) => onUpdate({ detailNo: v })} />
        <MiniCell value={row.csiCode} onChange={(v) => onUpdate({ csiCode: v })} className="font-mono text-brand-700" />
        <div className="border-l border-gray-100 px-1 py-0.5">
          <input type="text" value={row.description} onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full bg-transparent px-0.5 py-0.5 text-[10px] text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded" />
        </div>
        <MiniNum value={row.qty} onChange={(v) => onUpdate({ qty: v })} />
        <MiniNum value={row.wastePercent} onChange={(v) => onUpdate({ wastePercent: v })} step={0.5} className="text-orange-600" />
        <div className="border-l border-gray-100 px-1 py-1 text-right tabular-nums text-gray-600 bg-gray-50/50">
          {row.qtyWithWaste > 0 ? row.qtyWithWaste.toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}
        </div>
        <div className="border-l border-gray-100 px-0.5 py-0.5">
          <select value={row.unit} onChange={(e) => onUpdate({ unit: e.target.value })}
            className="w-full bg-transparent py-0.5 text-[9px] text-center focus:bg-white focus:outline-none rounded cursor-pointer">
            <option value="">—</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <MiniCurrency value={row.materialUnitCost} onChange={(v) => onUpdate({ materialUnitCost: v })} />
        <MiniCurrency value={row.laborUnitCost} onChange={(v) => onUpdate({ laborUnitCost: v })} />
        <MiniCurrency value={row.equipmentUnitCost} onChange={(v) => onUpdate({ equipmentUnitCost: v })} />
        <div className="border-l border-gray-100 px-1 py-1 text-right tabular-nums font-medium text-gray-700 bg-gray-50/50">
          {row.totalUnitCost > 0 ? formatCurrencyDetailed(row.totalUnitCost) : ''}
        </div>
        <div className="border-l border-gray-100 px-1 py-1 text-right tabular-nums font-semibold text-gray-900 bg-gray-50/50">
          {row.totalCost > 0 ? formatCurrencyDetailed(row.totalCost) : ''}
        </div>
        <div className="border-l border-gray-100" />
        <div className="border-l border-gray-100 flex items-center justify-center">
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Option GR / GC Grids ────────────────────────────────────────────────

function OptionGR({ optionId, rows, subtotal }: { optionId: string; rows: Option['generalRequirementsRows']; subtotal: number }) {
  const { addOptionGR, updateOptionGR, removeOptionGR } = useEstimateStore();
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_60px_60px_100px_100px_120px_32px] bg-gray-100 border-b border-gray-200 text-[8px] font-bold uppercase tracking-wider text-gray-500">
        <div className="px-3 py-1.5">Description</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">QTY</div>
        <div className="px-1 py-1.5 text-center border-l border-gray-200">Unit</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Mat $/U</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Lab $/U</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Total</div>
        <div className="border-l border-gray-200" />
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_60px_60px_100px_100px_120px_32px] items-center group hover:bg-blue-50/30">
            <div className="px-3 py-1"><input type="text" value={row.description} onChange={(e) => updateOptionGR(optionId, row.id, { description: e.target.value })} className="w-full bg-transparent text-[10px] focus:outline-none focus:bg-white rounded px-1" placeholder="Item" /></div>
            <div className="border-l border-gray-100 px-1 py-0.5"><input type="number" value={row.qty || ''} onChange={(e) => updateOptionGR(optionId, row.id, { qty: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-[10px] text-right tabular-nums focus:outline-none focus:bg-white rounded px-1" /></div>
            <div className="border-l border-gray-100 px-0.5 py-0.5"><select value={row.unit} onChange={(e) => updateOptionGR(optionId, row.id, { unit: e.target.value })} className="w-full bg-transparent text-[9px] text-center focus:outline-none focus:bg-white rounded">{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
            <div className="border-l border-gray-100 px-1 py-0.5"><input type="number" value={row.materialUnitCost || ''} onChange={(e) => updateOptionGR(optionId, row.id, { materialUnitCost: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-[10px] text-right tabular-nums focus:outline-none focus:bg-white rounded px-1" step="100" /></div>
            <div className="border-l border-gray-100 px-1 py-0.5"><input type="number" value={row.laborUnitCost || ''} onChange={(e) => updateOptionGR(optionId, row.id, { laborUnitCost: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-[10px] text-right tabular-nums focus:outline-none focus:bg-white rounded px-1" step="100" /></div>
            <div className="border-l border-gray-100 px-2 py-1 text-right text-[10px] font-semibold tabular-nums">{formatCurrencyDetailed(row.totalCost)}</div>
            <div className="border-l border-gray-100 flex items-center justify-center"><button onClick={() => removeOptionGR(optionId, row.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 className="h-2.5 w-2.5" /></button></div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-4 text-[10px] text-gray-400 text-center">No items</div>}
      </div>
      <div className="border-t border-gray-200 px-3 py-1.5 flex items-center justify-between bg-gray-50">
        <button onClick={() => addOptionGR(optionId)} className="text-brand-600 hover:text-brand-700 text-[10px] font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
        <span className="text-[10px] font-bold tabular-nums">{formatCurrencyDetailed(subtotal)}</span>
      </div>
    </div>
  );
}

function OptionGC({ optionId, rows, subtotal }: { optionId: string; rows: Option['generalConditionsRows']; subtotal: number }) {
  const { addOptionGC, updateOptionGC, removeOptionGC } = useEstimateStore();
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_100px_120px_140px_32px] bg-gray-100 border-b border-gray-200 text-[8px] font-bold uppercase tracking-wider text-gray-500">
        <div className="px-3 py-1.5">Description</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Duration</div>
        <div className="px-1 py-1.5 text-center border-l border-gray-200">Unit</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Rate</div>
        <div className="px-1 py-1.5 text-right border-l border-gray-200">Total</div>
        <div className="border-l border-gray-200" />
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_80px_100px_120px_140px_32px] items-center group hover:bg-amber-50/30">
            <div className="px-3 py-1"><input type="text" value={row.description} onChange={(e) => updateOptionGC(optionId, row.id, { description: e.target.value })} className="w-full bg-transparent text-[10px] focus:outline-none focus:bg-white rounded px-1" placeholder="Item" /></div>
            <div className="border-l border-gray-100 px-1 py-0.5"><input type="number" value={row.duration || ''} onChange={(e) => updateOptionGC(optionId, row.id, { duration: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-[10px] text-right tabular-nums focus:outline-none focus:bg-white rounded px-1" /></div>
            <div className="border-l border-gray-100 px-0.5 py-0.5"><select value={row.durationUnit} onChange={(e) => updateOptionGC(optionId, row.id, { durationUnit: e.target.value as 'weeks' | 'months' })} className="w-full bg-transparent text-[9px] text-center focus:outline-none focus:bg-white rounded"><option value="weeks">Weeks</option><option value="months">Months</option></select></div>
            <div className="border-l border-gray-100 px-1 py-0.5"><input type="number" value={row.unitRate || ''} onChange={(e) => updateOptionGC(optionId, row.id, { unitRate: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent text-[10px] text-right tabular-nums focus:outline-none focus:bg-white rounded px-1" step="100" /></div>
            <div className="border-l border-gray-100 px-2 py-1 text-right text-[10px] font-semibold tabular-nums">{formatCurrencyDetailed(row.totalCost)}</div>
            <div className="border-l border-gray-100 flex items-center justify-center"><button onClick={() => removeOptionGC(optionId, row.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 className="h-2.5 w-2.5" /></button></div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-4 text-[10px] text-gray-400 text-center">No items</div>}
      </div>
      <div className="border-t border-gray-200 px-3 py-1.5 flex items-center justify-between bg-gray-50">
        <button onClick={() => addOptionGC(optionId)} className="text-brand-600 hover:text-brand-700 text-[10px] font-semibold flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
        <span className="text-[10px] font-bold tabular-nums">{formatCurrencyDetailed(subtotal)}</span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function MiniCell({ value, onChange, className: extraClass }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className="border-l border-gray-100 px-0.5 py-0.5">
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className={cn('w-full bg-transparent px-0.5 py-0.5 text-[10px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded', extraClass)} />
    </div>
  );
}

function MiniNum({ value, onChange, step = 1, className: extraClass }: { value: number; onChange: (v: number) => void; step?: number; className?: string }) {
  return (
    <div className="border-l border-gray-100 px-0.5 py-0.5">
      <input type="number" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn('w-full bg-transparent px-0.5 py-0.5 text-[10px] text-right tabular-nums focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded', extraClass)}
        step={step} placeholder="0" />
    </div>
  );
}

function MiniCurrency({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="border-l border-gray-100 px-0.5 py-0.5">
      <input type="number" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-transparent px-0.5 py-0.5 text-[10px] text-right tabular-nums focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded"
        step="0.01" placeholder="0.00" />
    </div>
  );
}

function MiniAddButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-[9px] font-semibold text-gray-500 hover:text-brand-700 transition-colors uppercase tracking-wider">
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function getVisibleRows(rows: EstimateRow[]): EstimateRow[] {
  const visible: EstimateRow[] = [];
  const collapsedParents = new Set<string>();
  for (const row of rows) {
    if (row.parentId && collapsedParents.has(row.parentId)) continue;
    visible.push(row);
    if (row.rowType === 'division_header' && !row.isExpanded) {
      collapsedParents.add(row.id);
    }
  }
  return visible;
}
