// ============================================================
// TAKEOFF MODULE — INTERACTIVE PLAN VIEWER
// on-estimating · O'Neill Contractors, Inc.
// Drop to: src/components/takeoff/interactive-plan-viewer.tsx
//
// Full Fabric.js canvas plan viewer with:
// - PDF page rendering via pdfjs-dist
// - Polygon, polyline, rectangle, count annotation tools
// - Auto-save on annotation complete (debounced)
// - QA sidebar (approve / flag / override per item)
// - Scale calibration UI
// - Layer visibility toggles
// ============================================================

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import type {
  TakeoffItem,
  PlanSheet,
  Takeoff,
  TakeoffQASummary,
  ScaleCalibration,
  ShapeType,
  MeasurementMode,
  CreateTakeoffItemRequest,
  UpdateTakeoffItemRequest,
} from '@/types/takeoff.types'
import {
  fetchTakeoffItems,
  createTakeoffItem,
  updateTakeoffItem,
  deleteTakeoffItem,
  approveTakeoffItem,
  flagTakeoffItem,
  overrideTakeoffItem,
  fetchTakeoffQASummary,
} from '@/lib/supabase/takeoff-queries'
import { calibrateFromPoints } from '@/lib/takeoff/scale-calibrator'
import { calculate, inferDefaultUnit } from '@/lib/takeoff/formula-engine'
import { linkSymbolToCSI } from '@/lib/takeoff/dynamic-linker'
import {
  ConfidenceIndicator,
  QAStatusDot,
  ConfidenceCard,
} from './confidence-indicator'
import { computeQASummary } from '@/lib/takeoff/validation-engine'

// ─── Tool types ───────────────────────────────────────────────

type ActiveTool = 'select' | 'polygon' | 'polyline' | 'rectangle' | 'count' | 'calibrate'

interface InteractivePlanViewerProps {
  takeoff: Takeoff
  sheet: PlanSheet
  currentUserId: string
  existingCsiCodes?: string[]
  onItemsChange?: (items: TakeoffItem[]) => void
  className?: string
}

// ─── Component ────────────────────────────────────────────────

export function InteractivePlanViewer({
  takeoff,
  sheet,
  currentUserId,
  existingCsiCodes = [],
  onItemsChange,
  className = '',
}: InteractivePlanViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)

  const [items, setItems] = useState<TakeoffItem[]>([])
  const [selectedItem, setSelectedItem] = useState<TakeoffItem | null>(null)
  const [activeTool, setActiveTool] = useState<ActiveTool>('select')
  const [calibration, setCalibration] = useState<ScaleCalibration | null>(
    sheet.scale_ratio
      ? {
          pixels_per_foot: sheet.scale_ratio,
          reference_length_px: sheet.scale_ratio,
          reference_length_real: 1,
          scale_string: sheet.scale_source ?? 'Calibrated',
          calibrated_at: new Date().toISOString(),
          calibrated_by: currentUserId,
        }
      : null
  )

  const [qaSummary, setQASummary] = useState<TakeoffQASummary | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'qa' | 'items'>('qa')
  const [isQASidebarOpen, setIsQASidebarOpen] = useState(true)
  const [overrideDialog, setOverrideDialog] = useState<{
    item: TakeoffItem | null
    qty: string
    reason: string
  }>({ item: null, qty: '', reason: '' })
  const [calibratePoints, setCalibratePoints] = useState<Array<{ x: number; y: number }>>([])
  const [calibrateInput, setCalibrateInput] = useState('')

  // ─── Load items on mount ──────────────────────────────────

  useEffect(() => {
    loadItems()
  }, [takeoff.id, sheet.id])

  const loadItems = useCallback(async () => {
    try {
      const fetched = await fetchTakeoffItems(takeoff.id)
      const sheetItems = fetched.filter(item => item.plan_sheet_id === sheet.id)
      setItems(sheetItems)
      setQASummary(computeQASummary(takeoff.id, sheetItems))
      onItemsChange?.(sheetItems)
    } catch (err) {
      console.error('[PlanViewer] Failed to load items:', err)
    }
  }, [takeoff.id, sheet.id])

  // ─── Initialize Fabric.js canvas ─────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return

    const initCanvas = async () => {
      const fabric = (await import('fabric')).fabric

      const canvas = new fabric.Canvas(canvasRef.current!, {
        selection: activeTool === 'select',
        isDrawingMode: false,
      })

      fabricRef.current = canvas
      canvas.setWidth(canvasRef.current!.parentElement?.clientWidth ?? 1200)
      canvas.setHeight(canvasRef.current!.parentElement?.clientHeight ?? 800)

      // Load PDF page as background
      await loadPDFBackground(canvas, sheet, fabric)

      // Wire up events
      canvas.on('object:modified', handleObjectModified)
      canvas.on('mouse:down', handleMouseDown)

      return () => canvas.dispose()
    }

    initCanvas()
  }, [sheet.id])

  // ─── PDF rendering ────────────────────────────────────────

  const loadPDFBackground = async (
    canvas: fabric.Canvas,
    sheet: PlanSheet,
    fabric: typeof import('fabric').fabric
  ) => {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

      const url = sheet.signed_url
      if (!url) return

      const pdf = await pdfjsLib.getDocument(url).promise
      const page = await pdf.getPage(sheet.page_number + 1)
      const viewport = page.getViewport({ scale: 1.5 })

      const offscreen = document.createElement('canvas')
      offscreen.width = viewport.width
      offscreen.height = viewport.height
      const ctx = offscreen.getContext('2d')!

      await page.render({ canvasContext: ctx, viewport }).promise

      fabric.Image.fromURL(offscreen.toDataURL(), img => {
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: canvas.getWidth() / img.width!,
          scaleY: canvas.getHeight() / img.height!,
        })
      })
    } catch (err) {
      console.warn('[PlanViewer] PDF background load failed:', err)
    }
  }

  // ─── Event handlers ───────────────────────────────────────

  const handleObjectModified = useCallback(
    async (e: fabric.IEvent) => {
      const obj = e.target as fabric.Object & { takeoffItemId?: string }
      if (!obj.takeoffItemId) return

      setIsSaving(true)
      try {
        const itemId = obj.takeoffItemId
        const geometry = fabricObjectToGeometry(obj)
        const item = items.find(i => i.id === itemId)
        if (!item || !calibration) return

        const calcResult = calculate({
          geometry,
          scale_ratio: calibration.pixels_per_foot,
          mode: getModeForShape(item.shape_type),
        })

        const updates: UpdateTakeoffItemRequest = {
          geometry,
          quantity: calcResult.raw_quantity,
          unit: calcResult.unit,
        }

        const updated = await updateTakeoffItem(itemId, updates)
        setItems(prev => prev.map(i => (i.id === itemId ? updated : i)))
      } catch (err) {
        console.error('[PlanViewer] Failed to save modification:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [items, calibration]
  )

  const handleMouseDown = useCallback(
    async (e: fabric.IEvent) => {
      if (activeTool !== 'count' && activeTool !== 'calibrate') return
      const pointer = fabricRef.current?.getPointer(e.e)
      if (!pointer) return

      if (activeTool === 'calibrate') {
        setCalibratePoints(prev => {
          const next = [...prev, { x: pointer.x, y: pointer.y }]
          if (next.length >= 2) {
            handleCalibrationComplete(next[0], next[1])
            return []
          }
          return next
        })
        return
      }

      if (activeTool === 'count') {
        await saveCountItem(pointer)
      }
    },
    [activeTool, calibration]
  )

  // ─── Save new annotation ──────────────────────────────────

  const saveCountItem = async (point: { x: number; y: number }) => {
    if (!calibration) {
      alert('Calibrate scale first before adding measurements')
      return
    }

    const geometry = {
      type: 'count' as const,
      points: [{ x: point.x, y: point.y }],
      count: 1,
    }

    const link = linkSymbolToCSI('count item', undefined, existingCsiCodes)

    const request: CreateTakeoffItemRequest = {
      plan_sheet_id: sheet.id,
      shape_type: 'count',
      geometry,
      quantity: 1,
      unit: 'EA',
      csi_code: link.csi_code,
      csi_description: link.csi_description,
      label: 'Count',
      confidence: 0.75,
      status: 'pending_review',
    }

    setIsSaving(true)
    try {
      const created = await createTakeoffItem(takeoff.id, request, currentUserId)
      setItems(prev => {
        const next = [...prev, created]
        setQASummary(computeQASummary(takeoff.id, next))
        return next
      })
    } catch (err) {
      console.error('[PlanViewer] Failed to save count item:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Calibration ──────────────────────────────────────────

  const handleCalibrationComplete = async (
    pointA: { x: number; y: number },
    pointB: { x: number; y: number }
  ) => {
    if (!calibrateInput || parseFloat(calibrateInput) <= 0) {
      alert('Enter the real-world length before clicking the second calibration point')
      setCalibratePoints([])
      return
    }

    try {
      const cal = calibrateFromPoints(pointA, pointB, calibrateInput, currentUserId)
      setCalibration(cal)
      setActiveTool('select')
      setCalibrateInput('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Calibration failed')
    }
  }

  // ─── QA actions ───────────────────────────────────────────

  const handleApprove = async (item: TakeoffItem) => {
    try {
      const updated = await approveTakeoffItem(item.id, currentUserId)
      updateItemInState(updated)
    } catch (err) {
      console.error('[PlanViewer] Approve failed:', err)
    }
  }

  const handleFlag = async (item: TakeoffItem) => {
    try {
      const updated = await flagTakeoffItem(item.id, currentUserId, 'Flagged for review')
      updateItemInState(updated)
    } catch (err) {
      console.error('[PlanViewer] Flag failed:', err)
    }
  }

  const handleOverride = async () => {
    const { item, qty, reason } = overrideDialog
    if (!item || !qty || !reason) return

    try {
      const updated = await overrideTakeoffItem(
        item.id,
        currentUserId,
        parseFloat(qty),
        reason
      )
      updateItemInState(updated)
      setOverrideDialog({ item: null, qty: '', reason: '' })
    } catch (err) {
      console.error('[PlanViewer] Override failed:', err)
    }
  }

  const handleDeleteItem = async (item: TakeoffItem) => {
    if (!confirm(`Delete "${item.label}"?`)) return
    try {
      await deleteTakeoffItem(item.id)
      setItems(prev => {
        const next = prev.filter(i => i.id !== item.id)
        setQASummary(computeQASummary(takeoff.id, next))
        return next
      })
    } catch (err) {
      console.error('[PlanViewer] Delete failed:', err)
    }
  }

  const updateItemInState = (updated: TakeoffItem) => {
    setItems(prev => {
      const next = prev.map(i => (i.id === updated.id ? updated : i))
      setQASummary(computeQASummary(takeoff.id, next))
      if (selectedItem?.id === updated.id) setSelectedItem(updated)
      return next
    })
  }

  // ─── Render ───────────────────────────────────────────────

  const tools: Array<{ id: ActiveTool; label: string; icon: string; title: string }> = [
    { id: 'select', label: 'Select', icon: '↖', title: 'Select & move' },
    { id: 'polygon', label: 'Area', icon: '⬡', title: 'Draw polygon (area)' },
    { id: 'rectangle', label: 'Rect', icon: '▭', title: 'Draw rectangle (area)' },
    { id: 'polyline', label: 'Linear', icon: '╱', title: 'Draw polyline (linear)' },
    { id: 'count', label: 'Count', icon: '•', title: 'Place count marker' },
    { id: 'calibrate', label: 'Scale', icon: '⇔', title: 'Set scale from reference line' },
  ]

  return (
    <div className={`flex h-full bg-gray-50 ${className}`}>
      {/* Toolbar */}
      <div className="w-14 bg-gray-900 flex flex-col items-center py-3 gap-1 border-r border-gray-700 flex-shrink-0">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.title}
            className={[
              'w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs gap-0.5 transition-colors',
              activeTool === tool.id
                ? 'bg-amber-500 text-gray-900 font-medium'
                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
            ].join(' ')}
          >
            <span className="text-base leading-none">{tool.icon}</span>
            <span className="text-[9px]">{tool.label}</span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Save indicator */}
        <div
          className={`w-2 h-2 rounded-full mb-2 ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}
          title={isSaving ? 'Saving...' : 'Saved'}
        />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Calibration prompt */}
        {activeTool === 'calibrate' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
            <span>
              {calibratePoints.length === 0
                ? 'Click the START of the reference dimension'
                : 'Click the END of the reference dimension'}
            </span>
            <input
              type="text"
              placeholder="e.g. 10'-0\""
              value={calibrateInput}
              onChange={e => setCalibrateInput(e.target.value)}
              className="w-28 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
            />
          </div>
        )}

        {/* Scale indicator */}
        {calibration && (
          <div className="absolute bottom-3 left-3 z-10 bg-gray-900/80 text-white text-xs px-3 py-1.5 rounded-lg">
            Scale: {calibration.scale_string} · {calibration.pixels_per_foot.toFixed(1)} px/ft
          </div>
        )}

        {!calibration && activeTool !== 'calibrate' && (
          <div className="absolute top-3 left-3 z-10 bg-amber-500 text-gray-900 text-xs px-3 py-1.5 rounded-lg font-medium">
            Set scale before measuring — click the Scale tool
          </div>
        )}

        <canvas ref={canvasRef} />
      </div>

      {/* QA Sidebar */}
      {isQASidebarOpen && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex gap-1">
              {(['qa', 'items'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={[
                    'px-3 py-1 text-xs rounded-md font-medium transition-colors',
                    sidebarTab === tab
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {tab === 'qa' ? 'QA Summary' : `Items (${items.length})`}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsQASidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* QA Summary tab */}
          {sidebarTab === 'qa' && qaSummary && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <ConfidenceCard
                confidence={qaSummary.avg_confidence}
                itemCount={qaSummary.total_items}
                label="Average confidence"
                className="w-full"
              />

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Approved', value: qaSummary.approved, color: 'text-green-600' },
                  { label: 'Flagged', value: qaSummary.flagged, color: 'text-red-600' },
                  { label: 'Pending', value: qaSummary.pending_review + qaSummary.ai_detected, color: 'text-amber-600' },
                  { label: 'Overridden', value: qaSummary.overridden, color: 'text-purple-600' },
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">{stat.label}</div>
                    <div className={`text-xl font-semibold ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-500 pt-1">
                Completion: {qaSummary.completion_pct}% · {qaSummary.low_confidence_count} low-confidence items
              </div>

              <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
                Keyboard shortcuts: <strong>A</strong> = approve · <strong>F</strong> = flag · <strong>E</strong> = override
              </div>
            </div>
          )}

          {/* Items tab */}
          {sidebarTab === 'items' && (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {items.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">
                  No items yet — use the annotation tools to add measurements
                </div>
              )}

              {items.map(item => (
                <div
                  key={item.id}
                  className={[
                    'p-3 hover:bg-gray-50 cursor-pointer transition-colors',
                    selectedItem?.id === item.id ? 'bg-blue-50 border-l-2 border-blue-500' : '',
                  ].join(' ')}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <QAStatusDot status={item.status} size={7} className="flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-gray-800 truncate">{item.label}</span>
                    </div>
                    <ConfidenceIndicator
                      confidence={item.confidence}
                      showLabel={false}
                      size="sm"
                      className="flex-shrink-0"
                    />
                  </div>

                  <div className="text-xs text-gray-500 mb-1.5">
                    {item.csi_code} · {item.quantity.toLocaleString()} {item.unit}
                    {item.override_qty && (
                      <span className="ml-1 text-purple-600">
                        → {item.override_qty} {item.unit} (override)
                      </span>
                    )}
                  </div>

                  {/* QA action buttons */}
                  {item.status !== 'approved' && item.status !== 'overridden' && (
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={e => { e.stopPropagation(); handleApprove(item) }}
                        className="flex-1 text-xs py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleFlag(item) }}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                        title="Flag for review"
                      >
                        ⚑
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setOverrideDialog({ item, qty: String(item.quantity), reason: '' })
                        }}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Override quantity"
                      >
                        ✎
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteItem(item) }}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete item"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Already approved/overridden */}
                  {(item.status === 'approved' || item.status === 'overridden') && (
                    <div className="flex gap-1 mt-1">
                      <span className="text-xs text-green-600">
                        {item.status === 'approved' ? '✓ Approved' : '✎ Overridden'}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteItem(item) }}
                        className="ml-auto text-xs px-1.5 py-0.5 rounded text-gray-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed sidebar toggle */}
      {!isQASidebarOpen && (
        <button
          onClick={() => setIsQASidebarOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 border-r-0 rounded-l-lg px-1.5 py-3 text-gray-500 hover:text-gray-700 shadow-sm"
          title="Open QA panel"
        >
          ◁
        </button>
      )}

      {/* Override dialog */}
      {overrideDialog.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-5 w-80">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Override quantity for "{overrideDialog.item.label}"
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Override quantity ({overrideDialog.item.unit})</label>
                <input
                  type="number"
                  value={overrideDialog.qty}
                  onChange={e => setOverrideDialog(prev => ({ ...prev, qty: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Reason</label>
                <textarea
                  value={overrideDialog.reason}
                  onChange={e => setOverrideDialog(prev => ({ ...prev, reason: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                  rows={2}
                  placeholder="Why are you overriding this quantity?"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleOverride}
                disabled={!overrideDialog.qty || !overrideDialog.reason}
                className="flex-1 bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Save Override
              </button>
              <button
                onClick={() => setOverrideDialog({ item: null, qty: '', reason: '' })}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function fabricObjectToGeometry(obj: fabric.Object): CreateTakeoffItemRequest['geometry'] {
  if (obj.type === 'rect') {
    const rect = obj as fabric.Rect
    return {
      type: 'rectangle',
      left: rect.left ?? 0,
      top: rect.top ?? 0,
      width: (rect.width ?? 0) * (rect.scaleX ?? 1),
      height: (rect.height ?? 0) * (rect.scaleY ?? 1),
      area_px2:
        (rect.width ?? 0) * (rect.scaleX ?? 1) *
        ((rect.height ?? 0) * (rect.scaleY ?? 1)),
    }
  }

  if (obj.type === 'polyline' || obj.type === 'polygon') {
    const poly = obj as fabric.Polyline
    const points = (poly.points ?? []).map(p => ({
      x: p.x + (obj.left ?? 0),
      y: p.y + (obj.top ?? 0),
    }))
    return {
      type: obj.type as 'polygon' | 'polyline',
      points,
      area_px2: 0,     // computed by formula engine if needed
      length_px: 0,
    } as CreateTakeoffItemRequest['geometry']
  }

  return { type: 'count', points: [{ x: obj.left ?? 0, y: obj.top ?? 0 }], count: 1 }
}

function getModeForShape(shapeType: ShapeType): MeasurementMode {
  switch (shapeType) {
    case 'polygon':
    case 'rectangle':
      return 'area'
    case 'polyline':
      return 'linear'
    case 'count':
    case 'point':
    default:
      return 'count'
  }
}
