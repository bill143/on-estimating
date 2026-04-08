'use client';

import { Plus, Trash2, Trophy, CheckCircle2, Users } from 'lucide-react';
import { useEstimateStore, type SubBidScope, type SubBid } from '@/lib/estimate-store';
import { formatCurrencyDetailed, cn } from '@/lib/utils';

export function SubBidGridTab() {
  const {
    subBidScopes,
    addSubBidScope,
    removeSubBidScope,
    updateSubBidScope,
    addSubBid,
    updateSubBid,
    removeSubBid,
    selectWinningBid,
  } = useEstimateStore();

  const totalSelected = subBidScopes.reduce((sum, scope) => sum + scope.selectedAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-teal-400 shrink-0" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Subcontractor Bid Grid
            </h2>
          </div>
          <span className="text-sm font-black text-emerald-400 tabular-nums">
            {formatCurrencyDetailed(totalSelected)}
          </span>
        </div>
      </div>

      {/* Scope Cards */}
      {subBidScopes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">
            No subcontractor scopes defined.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Add scope items to compare bids from multiple subcontractors per trade.
          </p>
          <button
            onClick={addSubBidScope}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add First Scope Item
          </button>
        </div>
      ) : (
        <>
          {subBidScopes.map((scope) => (
            <ScopeCard
              key={scope.id}
              scope={scope}
              onRemoveScope={() => removeSubBidScope(scope.id)}
              onUpdateScope={(updates) => updateSubBidScope(scope.id, updates)}
              onAddBid={() => addSubBid(scope.id)}
              onUpdateBid={(bidId, updates) => updateSubBid(scope.id, bidId, updates)}
              onRemoveBid={(bidId) => removeSubBid(scope.id, bidId)}
              onSelectWinner={(bidId) => selectWinningBid(scope.id, bidId)}
            />
          ))}

          {/* Add Scope Button */}
          <div className="flex justify-center">
            <button
              onClick={addSubBidScope}
              className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-6 py-3 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Scope Item
            </button>
          </div>
        </>
      )}

      {/* Summary Bar */}
      {subBidScopes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-t-4 border-gray-900 px-6 py-4 flex items-center justify-between bg-gray-900">
            <span className="text-sm font-black text-white uppercase tracking-widest">
              Total Selected Subcontractor Bids
            </span>
            <span className="text-xl font-black tabular-nums text-emerald-400">
              {formatCurrencyDetailed(totalSelected)}
            </span>
          </div>
          <div className="px-6 py-3 bg-gray-50">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {subBidScopes.map((scope) => (
                <div key={scope.id} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-mono text-brand-600">{scope.csiCode || '—'}</span>
                  <span className="text-gray-400">|</span>
                  <span className="truncate max-w-[200px]">{scope.scopeDescription || 'Untitled Scope'}</span>
                  <span className="text-gray-400">:</span>
                  <span className={cn(
                    'font-semibold tabular-nums',
                    scope.selectedAmount > 0 ? 'text-emerald-600' : 'text-gray-400'
                  )}>
                    {scope.selectedAmount > 0 ? formatCurrencyDetailed(scope.selectedAmount) : 'No selection'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scope Card ───────────────────────────────────────────────────────────

function ScopeCard({
  scope,
  onRemoveScope,
  onUpdateScope,
  onAddBid,
  onUpdateBid,
  onRemoveBid,
  onSelectWinner,
}: {
  scope: SubBidScope;
  onRemoveScope: () => void;
  onUpdateScope: (updates: Partial<Pick<SubBidScope, 'csiCode' | 'scopeDescription'>>) => void;
  onAddBid: () => void;
  onUpdateBid: (bidId: string, updates: Partial<SubBid>) => void;
  onRemoveBid: (bidId: string) => void;
  onSelectWinner: (bidId: string) => void;
}) {
  const lowBidAmount = scope.bids.length > 0
    ? Math.min(...scope.bids.filter((b) => b.bidAmount > 0).map((b) => b.bidAmount))
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Scope Header */}
      <div className="bg-gray-800 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-2 w-2 rounded-full bg-teal-400 shrink-0" />
          <input
            type="text"
            value={scope.csiCode}
            onChange={(e) => onUpdateScope({ csiCode: e.target.value })}
            className="w-24 bg-transparent text-sm font-mono font-bold text-amber-300 focus:outline-none focus:bg-gray-700 rounded px-1 shrink-0"
            placeholder="CSI Code"
          />
          <span className="text-gray-500">—</span>
          <input
            type="text"
            value={scope.scopeDescription}
            onChange={(e) => onUpdateScope({ scopeDescription: e.target.value })}
            className="flex-1 bg-transparent text-sm font-semibold text-white focus:outline-none focus:bg-gray-700 rounded px-1 min-w-0"
            placeholder="Scope Description"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {scope.selectedAmount > 0 && (
            <span className="text-sm font-black text-emerald-400 tabular-nums">
              {formatCurrencyDetailed(scope.selectedAmount)}
            </span>
          )}
          <button
            onClick={onRemoveScope}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Remove scope"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Bid Comparison Table */}
      {scope.bids.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2 text-left">Sub Name</th>
                <th className="px-3 py-2 text-left border-l border-gray-200">Contact</th>
                <th className="px-3 py-2 text-right border-l border-gray-200">Bid Amount</th>
                <th className="px-3 py-2 text-center border-l border-gray-200">Bid Date</th>
                <th className="px-3 py-2 text-left border-l border-gray-200">Notes</th>
                <th className="px-3 py-2 text-center border-l border-gray-200 w-20">Winner</th>
                <th className="px-2 py-2 text-center border-l border-gray-200 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scope.bids.map((bid) => {
                const isLow = bid.bidAmount > 0 && bid.bidAmount === lowBidAmount;
                return (
                  <tr
                    key={bid.id}
                    className={cn(
                      'group transition-colors',
                      bid.isSelected
                        ? 'bg-emerald-50 hover:bg-emerald-100/70'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    {/* Sub Name */}
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={bid.subName}
                          onChange={(e) => onUpdateBid(bid.id, { subName: e.target.value })}
                          className={cn(
                            'w-full bg-transparent text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-400 rounded px-1 py-0.5',
                            bid.isSelected ? 'font-semibold text-emerald-800' : 'text-gray-800'
                          )}
                          placeholder="Subcontractor name"
                        />
                        {bid.isSelected && (
                          <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-3 py-1.5 border-l border-gray-100">
                      <input
                        type="text"
                        value={bid.contactInfo}
                        onChange={(e) => onUpdateBid(bid.id, { contactInfo: e.target.value })}
                        className="w-full bg-transparent text-sm text-gray-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-400 rounded px-1 py-0.5"
                        placeholder="Phone / Email"
                      />
                    </td>

                    {/* Bid Amount */}
                    <td className="px-3 py-1.5 border-l border-gray-100">
                      <div className="flex items-center justify-end gap-2">
                        {isLow && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-700 tracking-wider shrink-0">
                            LOW
                          </span>
                        )}
                        <input
                          type="number"
                          value={bid.bidAmount || ''}
                          onChange={(e) => onUpdateBid(bid.id, { bidAmount: parseFloat(e.target.value) || 0 })}
                          className={cn(
                            'w-32 bg-transparent text-sm text-right tabular-nums focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-400 rounded px-1 py-0.5',
                            bid.isSelected ? 'font-bold text-emerald-700' : 'text-gray-800'
                          )}
                          placeholder="0.00"
                          step="100"
                        />
                      </div>
                    </td>

                    {/* Bid Date */}
                    <td className="px-3 py-1.5 border-l border-gray-100">
                      <input
                        type="date"
                        value={bid.bidDate}
                        onChange={(e) => onUpdateBid(bid.id, { bidDate: e.target.value })}
                        className="w-full bg-transparent text-sm text-gray-600 text-center focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-400 rounded px-1 py-0.5"
                      />
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-1.5 border-l border-gray-100">
                      <input
                        type="text"
                        value={bid.notes}
                        onChange={(e) => onUpdateBid(bid.id, { notes: e.target.value })}
                        className="w-full bg-transparent text-sm text-gray-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-400 rounded px-1 py-0.5"
                        placeholder="Notes..."
                      />
                    </td>

                    {/* Winner Toggle */}
                    <td className="px-3 py-1.5 border-l border-gray-100 text-center">
                      <button
                        onClick={() => onSelectWinner(bid.id)}
                        className={cn(
                          'inline-flex items-center justify-center h-7 w-7 rounded-full transition-colors',
                          bid.isSelected
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'
                        )}
                        title={bid.isSelected ? 'Winning bid' : 'Select as winner'}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-1.5 border-l border-gray-100 text-center">
                      <button
                        onClick={() => onRemoveBid(bid.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                        title="Remove bid"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-6 text-center">
          <p className="text-xs text-gray-400">No bids entered for this scope. Add subcontractors to compare bids.</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between">
        <button
          onClick={onAddBid}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-brand-600 hover:text-brand-700 uppercase tracking-wider transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Subcontractor
        </button>
        {scope.bids.length > 0 && (
          <div className="flex items-center gap-4 text-[10px] text-gray-400">
            <span>{scope.bids.length} bid{scope.bids.length !== 1 ? 's' : ''}</span>
            {lowBidAmount > 0 && (
              <span>
                Low: <span className="font-semibold text-emerald-600 tabular-nums">{formatCurrencyDetailed(lowBidAmount)}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
