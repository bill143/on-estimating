'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  FileText,
  Layers,
  MessageSquare,
  Hash,
  Sigma,
} from 'lucide-react';
import {
  useEstimateStore,
  type EstimateRow,
  type RowType,
  UNITS,
} from '@/lib/estimate-store';
import { formatCurrencyDetailed } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ─── Column Template ─────────────────────────────────────────────────────
// 16 columns: SR# | Sheet | Detail | CSI | Description | QTY | WASTE% | QTY W/W | UNIT | Mat$/U | Lab$/U | Eq$/U | Tot$/U | TotCost | SubTotals | Actions
const COL_TEMPLATE =
  'grid-cols-[44px_60px_60px_76px_1fr_68px_52px_76px_52px_80px_80px_80px_80px_96px_96px_32px]';

// ─── Main Grid Component ─────────────────────────────────────────────────
export function EstimateGrid() {
  const { rows, toggleExpand, addRow, updateRow, removeRow, moveRow } = useEstimateStore();
  const visibleRows = getVisibleRows(rows);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Column Header */}
      <div
        className={cn(
          'grid gap-0 border-b-2 border-gray-300 bg-gray-100 text-[9px] font-bold uppercase tracking-wider text-gray-500',
          COL_TEMPLATE
        )}
      >
        <ColHeader label="SR#" align="center" />
        <ColHeader label="Sheet" />
        <ColHeader label="Detail" />
        <ColHeader label="CSI No." />
        <ColHeader label="Description" />
        <ColHeader label="QTY" align="right" />
        <ColHeader label="Waste%" align="right" />
        <ColHeader label="QTY W/W" align="right" />
        <ColHeader label="Unit" align="center" />
        <ColHeader label="Mat $/U" align="right" />
        <ColHeader label="Lab $/U" align="right" />
        <ColHeader label="Eq $/U" align="right" />
        <ColHeader label="Tot $/U" align="right" />
        <ColHeader label="Total Cost" align="right" />
        <ColHeader label="Sub Totals" align="right" />
        <div className="border-l border-gray-200" /> {/* actions col */}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {visibleRows.map((row) => (
          <GridRow
            key={row.id}
            row={row}
            onToggle={() => toggleExpand(row.id)}
            onUpdate={(updates) => updateRow(row.id, updates)}
            onRemove={() => removeRow(row.id)}
            onAddAfter={(type) => addRow(type, row.id)}
            onMove={(dir) => moveRow(row.id, dir)}
          />
        ))}
      </div>

      {/* Footer — Add Buttons */}
      <div className="border-t border-gray-200 px-4 py-2.5 bg-gray-50 flex items-center gap-4">
        <AddRowButton type="division_header" icon={Layers} label="Division" onClick={() => addRow('division_header')} />
        <AddRowButton type="subsection_header" icon={Hash} label="Sub-Section" onClick={() => addRow('subsection_header')} />
        <AddRowButton type="line_item" icon={FileText} label="Line Item" onClick={() => addRow('line_item')} />
        <AddRowButton type="item_note" icon={MessageSquare} label="Note" onClick={() => addRow('item_note')} />
        <AddRowButton type="subtotal" icon={Sigma} label="Subtotal" onClick={() => addRow('subtotal')} />
      </div>
    </div>
  );
}

// ─── Column Header Cell ──────────────────────────────────────────────────
function ColHeader({ label, align = 'left' }: { label: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <div
      className={cn(
        'px-2 py-2 border-l border-gray-200 first:border-l-0 select-none',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center'
      )}
    >
      {label}
    </div>
  );
}

// ─── Row Dispatcher ──────────────────────────────────────────────────────
function GridRow({
  row,
  onToggle,
  onUpdate,
  onRemove,
  onAddAfter,
  onMove,
}: {
  row: EstimateRow;
  onToggle: () => void;
  onUpdate: (u: Partial<EstimateRow>) => void;
  onRemove: () => void;
  onAddAfter: (type: RowType) => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  switch (row.rowType) {
    case 'division_header':
      return <DivisionHeaderRow row={row} onToggle={onToggle} onAddAfter={onAddAfter} onUpdate={onUpdate} onRemove={onRemove} />;
    case 'subsection_header':
      return <SubsectionHeaderRow row={row} onUpdate={onUpdate} onRemove={onRemove} />;
    case 'item_note':
      return <ItemNoteRow row={row} onUpdate={onUpdate} onRemove={onRemove} />;
    case 'line_item':
      return <LineItemRow row={row} onUpdate={onUpdate} onRemove={onRemove} onMove={onMove} />;
    case 'subtotal':
      return <SubtotalRow row={row} onRemove={onRemove} />;
    default:
      return null;
  }
}

// ─── Row Type 1: Division Header ─────────────────────────────────────────
function DivisionHeaderRow({
  row,
  onToggle,
  onAddAfter,
  onUpdate,
  onRemove,
}: {
  row: EstimateRow;
  onToggle: () => void;
  onAddAfter: (type: RowType) => void;
  onUpdate: (u: Partial<EstimateRow>) => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-gray-800 text-white relative group">
      <div className={cn('grid gap-0', COL_TEMPLATE)}>
        {/* SR# */}
        <div className="px-2 py-2 text-xs font-mono text-gray-400 text-center">{row.srNo}</div>
        {/* Sheet */}
        <div className="border-l border-gray-700" />
        {/* Detail */}
        <div className="border-l border-gray-700" />
        {/* CSI */}
        <div className="border-l border-gray-700 px-2 py-2">
          <input
            type="text"
            value={row.csiCode}
            onChange={(e) => onUpdate({ csiCode: e.target.value })}
            className="w-full bg-transparent text-xs font-bold text-amber-300 font-mono focus:outline-none focus:bg-gray-700 rounded px-1"
          />
        </div>
        {/* Description — spans remaining */}
        <div className="border-l border-gray-700 px-2 py-2 flex items-center gap-2 col-span-1">
          <button onClick={onToggle} className="flex-shrink-0">
            {row.isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          <input
            type="text"
            value={row.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full bg-transparent text-xs font-bold text-white focus:outline-none focus:bg-gray-700 rounded px-1"
          />
        </div>
        {/* Empty numeric columns */}
        <div className="border-l border-gray-700" />
        <div className="border-l border-gray-700" />
        <div className="border-l border-gray-700" />
        <div className="border-l border-gray-700" />
        {/* Material subtotal */}
        <div className="border-l border-gray-700 px-2 py-2 text-right text-[10px] font-semibold text-blue-300 tabular-nums">
          {row.materialSubTotal > 0 ? formatCurrencyDetailed(row.materialSubTotal) : ''}
        </div>
        {/* Labor subtotal */}
        <div className="border-l border-gray-700 px-2 py-2 text-right text-[10px] font-semibold text-amber-300 tabular-nums">
          {row.laborSubTotal > 0 ? formatCurrencyDetailed(row.laborSubTotal) : ''}
        </div>
        {/* Equipment subtotal */}
        <div className="border-l border-gray-700 px-2 py-2 text-right text-[10px] font-semibold text-cyan-300 tabular-nums">
          {row.equipmentSubTotal > 0 ? formatCurrencyDetailed(row.equipmentSubTotal) : ''}
        </div>
        <div className="border-l border-gray-700" />
        {/* Total Cost */}
        <div className="border-l border-gray-700 px-2 py-2 text-right text-xs font-bold text-white tabular-nums">
          {row.subTotal > 0 ? formatCurrencyDetailed(row.subTotal) : ''}
        </div>
        {/* Sub Totals */}
        <div className="border-l border-gray-700 px-2 py-2 text-right text-xs font-bold text-emerald-400 tabular-nums">
          {row.subTotal > 0 ? formatCurrencyDetailed(row.subTotal) : ''}
        </div>
        {/* Actions */}
        <div className="border-l border-gray-700 flex items-center justify-center relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {showMenu && (
            <RowMenu
              onClose={() => setShowMenu(false)}
              onAdd={(type) => { onAddAfter(type); setShowMenu(false); }}
              onDelete={() => { onRemove(); setShowMenu(false); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Row Type 2: Sub-section Header ──────────────────────────────────────
function SubsectionHeaderRow({
  row,
  onUpdate,
  onRemove,
}: {
  row: EstimateRow;
  onUpdate: (u: Partial<EstimateRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-blue-50 group">
      <div className={cn('grid gap-0', COL_TEMPLATE)}>
        <div className="px-2 py-1.5 text-[10px] font-mono text-gray-400 text-center">{row.srNo}</div>
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100 px-2 py-1.5">
          <input
            type="text"
            value={row.csiCode}
            onChange={(e) => onUpdate({ csiCode: e.target.value })}
            className="w-full bg-transparent text-[10px] font-semibold text-blue-700 font-mono focus:outline-none focus:bg-white rounded px-1"
          />
        </div>
        <div className="border-l border-blue-100 px-2 py-1.5 col-span-1">
          <input
            type="text"
            value={row.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full bg-transparent text-xs font-semibold text-blue-900 focus:outline-none focus:bg-white rounded px-1 pl-4"
          />
        </div>
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100" />
        <div className="border-l border-blue-100 flex items-center justify-center">
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row Type 3: Item Note ───────────────────────────────────────────────
function ItemNoteRow({
  row,
  onUpdate,
  onRemove,
}: {
  row: EstimateRow;
  onUpdate: (u: Partial<EstimateRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-amber-50/50 group">
      <div className={cn('grid gap-0', COL_TEMPLATE)}>
        <div className="px-2 py-1.5 text-[10px] font-mono text-gray-400 text-center">{row.srNo}</div>
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100 px-2 py-1.5">
          <span className="text-[10px] text-amber-600 font-medium italic">NOTE</span>
        </div>
        <div className="border-l border-amber-100 px-2 py-1.5 col-span-1">
          <input
            type="text"
            value={row.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full bg-transparent text-xs italic text-amber-800 focus:outline-none focus:bg-white rounded px-1"
            placeholder="Enter note..."
          />
        </div>
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100" />
        <div className="border-l border-amber-100 flex items-center justify-center">
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row Type 4: Line Item (Full 14-Column Editable) ─────────────────────
function LineItemRow({
  row,
  onUpdate,
  onRemove,
  onMove,
}: {
  row: EstimateRow;
  onUpdate: (u: Partial<EstimateRow>) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  return (
    <div className="hover:bg-brand-50/20 transition-colors group text-xs">
      <div className={cn('grid gap-0', COL_TEMPLATE)}>
        {/* Col 1: SR# */}
        <div className="px-2 py-1 text-[10px] font-mono text-gray-400 text-center flex items-center justify-center">
          <span className="group-hover:hidden">{row.srNo}</span>
          <div className="hidden group-hover:flex flex-col gap-0">
            <button onClick={() => onMove('up')} className="text-gray-400 hover:text-gray-600"><ArrowUp className="h-2.5 w-2.5" /></button>
            <button onClick={() => onMove('down')} className="text-gray-400 hover:text-gray-600"><ArrowDown className="h-2.5 w-2.5" /></button>
          </div>
        </div>

        {/* Col 2: Sheet No. */}
        <CellText value={row.sheetNo} onChange={(v) => onUpdate({ sheetNo: v })} mono />

        {/* Col 3: Detail No. */}
        <CellText value={row.detailNo} onChange={(v) => onUpdate({ detailNo: v })} mono />

        {/* Col 4: CSI No. */}
        <CellText value={row.csiCode} onChange={(v) => onUpdate({ csiCode: v })} mono className="text-brand-700 font-semibold" />

        {/* Col 5: Description */}
        <div className="border-l border-gray-100 px-1 py-0.5">
          <input
            type="text"
            value={row.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full bg-transparent px-1 py-1 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded"
            placeholder="Line item description"
          />
        </div>

        {/* Col 6: QTY */}
        <CellNumber value={row.qty} onChange={(v) => onUpdate({ qty: v })} />

        {/* Col 7: WASTE% */}
        <CellNumber value={row.wastePercent} onChange={(v) => onUpdate({ wastePercent: v })} step={0.5} className="text-orange-600" />

        {/* Col 8: QTY W/WASTE (computed — read only) */}
        <div className="border-l border-gray-100 px-2 py-1.5 text-right tabular-nums text-gray-600 bg-gray-50/50">
          {row.qtyWithWaste > 0 ? row.qtyWithWaste.toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}
        </div>

        {/* Col 9: UNIT */}
        <div className="border-l border-gray-100 px-0.5 py-0.5">
          <select
            value={row.unit}
            onChange={(e) => onUpdate({ unit: e.target.value })}
            className="w-full bg-transparent py-1 text-[10px] text-center focus:bg-white focus:outline-none rounded cursor-pointer"
          >
            <option value="">—</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Col 10: Material $/Unit */}
        <CellCurrency value={row.materialUnitCost} onChange={(v) => onUpdate({ materialUnitCost: v })} />

        {/* Col 11: Labor $/Unit */}
        <CellCurrency value={row.laborUnitCost} onChange={(v) => onUpdate({ laborUnitCost: v })} />

        {/* Col 12: Equipment $/Unit */}
        <CellCurrency value={row.equipmentUnitCost} onChange={(v) => onUpdate({ equipmentUnitCost: v })} />

        {/* Col 13: Total Unit Cost (computed) */}
        <div className="border-l border-gray-100 px-2 py-1.5 text-right tabular-nums font-medium text-gray-700 bg-gray-50/50">
          {row.totalUnitCost > 0 ? formatCurrencyDetailed(row.totalUnitCost) : ''}
        </div>

        {/* Col 14: Total Cost (computed) */}
        <div className="border-l border-gray-100 px-2 py-1.5 text-right tabular-nums font-semibold text-gray-900 bg-gray-50/50">
          {row.totalCost > 0 ? formatCurrencyDetailed(row.totalCost) : ''}
        </div>

        {/* Col 15: Sub Totals (empty for line items) */}
        <div className="border-l border-gray-100" />

        {/* Actions */}
        <div className="border-l border-gray-100 flex items-center justify-center">
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row Type 5: Subtotal Row ────────────────────────────────────────────
function SubtotalRow({ row, onRemove }: { row: EstimateRow; onRemove: () => void }) {
  return (
    <div className="bg-emerald-50 border-t-2 border-emerald-200 group">
      <div className={cn('grid gap-0', COL_TEMPLATE)}>
        <div className="px-2 py-2 text-[10px] font-mono text-gray-400 text-center">{row.srNo}</div>
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100 px-2 py-2">
          <span className="text-xs font-bold text-emerald-800">{row.description || 'Section Subtotal'}</span>
        </div>
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100" />
        <div className="border-l border-emerald-100 px-2 py-2 text-right">
          <span className="text-xs font-black text-emerald-700 tabular-nums">
            {formatCurrencyDetailed(row.subTotal)}
          </span>
        </div>
        <div className="border-l border-emerald-100 flex items-center justify-center">
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Cell Components ────────────────────────────────────────────
function CellText({
  value,
  onChange,
  mono,
  className: extraClass,
}: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="border-l border-gray-100 px-1 py-0.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full bg-transparent px-1 py-1 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded',
          mono && 'font-mono',
          extraClass
        )}
      />
    </div>
  );
}

function CellNumber({
  value,
  onChange,
  step = 1,
  className: extraClass,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  className?: string;
}) {
  return (
    <div className="border-l border-gray-100 px-1 py-0.5">
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn(
          'w-full bg-transparent px-1 py-1 text-xs text-right tabular-nums focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded',
          extraClass
        )}
        step={step}
        placeholder="0"
      />
    </div>
  );
}

function CellCurrency({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="border-l border-gray-100 px-1 py-0.5">
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-transparent px-1 py-1 text-xs text-right tabular-nums focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 rounded"
        step="0.01"
        placeholder="0.00"
      />
    </div>
  );
}

// ─── Add Row Button ──────────────────────────────────────────────────────
function AddRowButton({
  icon: Icon,
  label,
  onClick,
}: {
  type: RowType;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 hover:text-brand-700 transition-colors uppercase tracking-wider"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── Context Menu for Division Headers ───────────────────────────────────
function RowMenu({
  onClose,
  onAdd,
  onDelete,
}: {
  onClose: () => void;
  onAdd: (type: RowType) => void;
  onDelete: () => void;
}) {
  const items: { type: RowType; label: string; icon: React.ElementType }[] = [
    { type: 'line_item', label: 'Line Item', icon: FileText },
    { type: 'subsection_header', label: 'Sub-Section', icon: Hash },
    { type: 'item_note', label: 'Note', icon: MessageSquare },
    { type: 'subtotal', label: 'Subtotal', icon: Sigma },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
        <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase">Insert After</p>
        {items.map((item) => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700"
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
        <div className="my-1 border-t border-gray-100" />
        <button
          onClick={onDelete}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Division
        </button>
      </div>
    </>
  );
}

// ─── Visibility Logic ────────────────────────────────────────────────────
function getVisibleRows(rows: EstimateRow[]): EstimateRow[] {
  const visible: EstimateRow[] = [];
  const collapsedParents = new Set<string>();

  for (const row of rows) {
    // Skip children of collapsed divisions
    if (row.parentId && collapsedParents.has(row.parentId)) {
      continue;
    }
    visible.push(row);
    if (
      (row.rowType === 'division_header') &&
      !row.isExpanded
    ) {
      collapsedParents.add(row.id);
    }
  }
  return visible;
}
