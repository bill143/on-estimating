'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TakeoffTool =
  | 'select'
  | 'linear'
  | 'area'
  | 'count'
  | 'calibrate'
  | 'pan'
  | 'zoom';

export type MeasurementType = 'LINEAR' | 'AREA' | 'COUNT' | 'VOLUME';

export interface Point {
  x: number;
  y: number;
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  points: Point[];
  value: number;
  unit: string;
  label: string;
  color: string;
  lineItemId?: string;
  csiCode?: string;
  pageIndex: number;
}
export interface DetectedOverlay {
  id: string;
  elementType: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  label: string;
  color: string;
  visible: boolean;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
}

export interface CalibrationState {
  isCalibrating: boolean;
  point1?: Point;
  point2?: Point;
  knownDistance?: number;
  unit: string;
}

interface InteractivePlanViewerProps {
  planUrl?: string;
  pageIndex?: number;
  measurements?: Measurement[];
  detectedElements?: DetectedOverlay[];
  onMeasurementAdd?: (measurement: Omit<Measurement, 'id'>) => void;
  onMeasurementSelect?: (id: string) => void;
  onMeasurementDelete?: (id: string) => void;
  onCalibrationComplete?: (pixelsPerUnit: number, unit: string) => void;
  onElementClick?: (elementId: string) => void;
  initialTool?: TakeoffTool;
  readOnly?: boolean;
  className?: string;
}
// ============================================================================
// CONSTANTS
// ============================================================================

const TOOL_COLORS: Record<MeasurementType, string> = {
  LINEAR: '#3B82F6',
  AREA: '#10B981',
  COUNT: '#F59E0B',
  VOLUME: '#8B5CF6',
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.1;
const POINT_RADIUS = 6;
const LINE_WIDTH = 2;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function distanceBetweenPoints(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function calculatePolygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}
// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

function TakeoffToolbar({
  activeTool,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onRotate,
  zoom,
  readOnly,
}: {
  activeTool: TakeoffTool;
  onToolChange: (tool: TakeoffTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onRotate: () => void;
  zoom: number;
  readOnly?: boolean;
}) {
  const tools: Array<{ id: TakeoffTool; label: string; icon: string; disabled?: boolean }> = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'pan', label: 'Pan', icon: '✋' },
    { id: 'linear', label: 'Linear', icon: '📏', disabled: readOnly },
    { id: 'area', label: 'Area', icon: '⬜', disabled: readOnly },
    { id: 'count', label: 'Count', icon: '#', disabled: readOnly },
    { id: 'calibrate', label: 'Calibrate', icon: '📐', disabled: readOnly },
  ];
  return (
    <div className="flex items-center gap-1 p-2 bg-gray-900 border-b border-gray-700 rounded-t-lg">
      <div className="flex items-center gap-1 mr-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => !tool.disabled && onToolChange(tool.id)}
            disabled={tool.disabled}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              activeTool === tool.id
                ? 'bg-blue-600 text-white'
                : tool.disabled
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title={tool.label}
          >
            <span className="mr-1">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-gray-700 mx-2" />

      <div className="flex items-center gap-1">
        <button onClick={onZoomOut} className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-sm">−</button>
        <span className="text-gray-400 text-xs w-14 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-sm">+</button>
        <button onClick={onZoomReset} className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-xs ml-1">Fit</button>
        <button onClick={onRotate} className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-sm ml-1">↻</button>
      </div>
    </div>
  );
}
// ============================================================================
// MEASUREMENT PANEL COMPONENT
// ============================================================================

function MeasurementPanel({
  measurements,
  selectedId,
  onSelect,
  onDelete,
}: {
  measurements: Measurement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (measurements.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center">
        No measurements yet. Use the toolbar to start measuring.
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      {measurements.map((m) => (
        <div
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-gray-800 ${
            selectedId === m.id ? 'bg-blue-900/30' : 'hover:bg-gray-800/50'
          }`}
        >          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
            <div>
              <div className="text-sm text-gray-200">{m.label || m.type}</div>
              <div className="text-xs text-gray-500">
                {m.value.toFixed(2)} {m.unit}
                {m.csiCode && <span className="ml-2 text-blue-400">[{m.csiCode}]</span>}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
            className="text-gray-600 hover:text-red-400 text-sm px-1"
            title="Delete measurement"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
// ============================================================================
// MAIN INTERACTIVE PLAN VIEWER COMPONENT
// ============================================================================

export default function InteractivePlanViewer({
  planUrl = '',
  pageIndex = 0,
  measurements: externalMeasurements = [],
  detectedElements = [],
  onMeasurementAdd,
  onMeasurementSelect,
  onMeasurementDelete,
  onCalibrationComplete,
  onElementClick,
  initialTool = 'select',
  readOnly = false,
  className = '',
}: InteractivePlanViewerProps) {
  // State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [activeTool, setActiveTool] = useState<TakeoffTool>(initialTool);
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0, rotation: 0 });
  const [measurements, setMeasurements] = useState<Measurement[]>(externalMeasurements);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [activePoints, setActivePoints] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);  const [calibration, setCalibration] = useState<CalibrationState>({
    isCalibrating: false,
    unit: 'ft',
  });
  const [pixelsPerUnit, setPixelsPerUnit] = useState<number>(1);
  const [showOverlays, setShowOverlays] = useState(true);
  const [countMarkers, setCountMarkers] = useState<Point[]>([]);

  // Sync external measurements
  useEffect(() => {
    setMeasurements(externalMeasurements);
  }, [externalMeasurements]);

  // =========================================================================
  // IMAGE LOADING
  // =========================================================================

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Auto-fit on load
      if (containerRef.current) {
        const container = containerRef.current;
        const scaleX = container.clientWidth / img.width;
        const scaleY = container.clientHeight / img.height;
        const fitZoom = Math.min(scaleX, scaleY) * 0.95;
        setViewState((prev) => ({ ...prev, zoom: fitZoom }));
      }
    };
    img.src = planUrl;
  }, [planUrl]);
  // =========================================================================
  // CANVAS RENDERING
  // =========================================================================

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img || !imageLoaded) return;

    // Set canvas size to container
    if (containerRef.current) {
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply transformations
    ctx.translate(viewState.panX + canvas.width / 2, viewState.panY + canvas.height / 2);
    ctx.rotate((viewState.rotation * Math.PI) / 180);
    ctx.scale(viewState.zoom, viewState.zoom);
    ctx.translate(-img.width / 2, -img.height / 2);

    // Draw the plan image
    ctx.drawImage(img, 0, 0);

    // Draw detected element overlays
    if (showOverlays) {
      detectedElements.filter((el) => el.visible).forEach((el) => {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = 2 / viewState.zoom;
        ctx.setLineDash([4 / viewState.zoom, 4 / viewState.zoom]);        ctx.strokeRect(el.boundingBox.x, el.boundingBox.y, el.boundingBox.width, el.boundingBox.height);
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = el.color;
        ctx.font = `${12 / viewState.zoom}px sans-serif`;
        ctx.fillText(
          `${el.label} (${Math.round(el.confidence * 100)}%)`,
          el.boundingBox.x,
          el.boundingBox.y - 4 / viewState.zoom
        );
      });
    }

    // Draw completed measurements
    measurements
      .filter((m) => m.pageIndex === pageIndex)
      .forEach((m) => {
        const isSelected = m.id === selectedMeasurementId;
        ctx.strokeStyle = m.color;
        ctx.fillStyle = m.color;
        ctx.lineWidth = (isSelected ? 3 : LINE_WIDTH) / viewState.zoom;
        ctx.setLineDash([]);

        if (m.type === 'LINEAR' && m.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(m.points[0].x, m.points[0].y);
          for (let i = 1; i < m.points.length; i++) {
            ctx.lineTo(m.points[i].x, m.points[i].y);
          }
          ctx.stroke();
          // Draw endpoints
          m.points.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, POINT_RADIUS / viewState.zoom, 0, Math.PI * 2);
            ctx.fill();
          });

          // Draw measurement label at midpoint
          const mid = {
            x: (m.points[0].x + m.points[m.points.length - 1].x) / 2,
            y: (m.points[0].y + m.points[m.points.length - 1].y) / 2 - 10 / viewState.zoom,
          };
          ctx.font = `bold ${14 / viewState.zoom}px sans-serif`;
          ctx.fillText(`${m.value.toFixed(2)} ${m.unit}`, mid.x, mid.y);
        }

        if (m.type === 'AREA' && m.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(m.points[0].x, m.points[0].y);
          m.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.globalAlpha = 0.15;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.stroke();

          // Area label at centroid
          const cx = m.points.reduce((s, p) => s + p.x, 0) / m.points.length;
          const cy = m.points.reduce((s, p) => s + p.y, 0) / m.points.length;
          ctx.font = `bold ${14 / viewState.zoom}px sans-serif`;
          ctx.fillText(`${m.value.toFixed(2)} ${m.unit}`, cx, cy);
        }
        if (m.type === 'COUNT') {
          m.points.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 12 / viewState.zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${10 / viewState.zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${i + 1}`, p.x, p.y);
            ctx.fillStyle = m.color;
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          });
        }
      });

    // Draw active points (in-progress measurement)
    if (activePoints.length > 0) {
      const color = activeTool === 'linear' ? TOOL_COLORS.LINEAR
        : activeTool === 'area' ? TOOL_COLORS.AREA
        : activeTool === 'count' ? TOOL_COLORS.COUNT
        : '#ffffff';

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = LINE_WIDTH / viewState.zoom;
      ctx.setLineDash([6 / viewState.zoom, 3 / viewState.zoom]);
      if (activePoints.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(activePoints[0].x, activePoints[0].y);
        for (let i = 1; i < activePoints.length; i++) {
          ctx.lineTo(activePoints[i].x, activePoints[i].y);
        }
        ctx.stroke();
      }

      activePoints.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, POINT_RADIUS / viewState.zoom, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.setLineDash([]);
    }

    // Draw calibration line
    if (calibration.isCalibrating && calibration.point1) {
      ctx.strokeStyle = '#EF4444';
      ctx.fillStyle = '#EF4444';
      ctx.lineWidth = 2 / viewState.zoom;
      ctx.setLineDash([8 / viewState.zoom, 4 / viewState.zoom]);

      ctx.beginPath();
      ctx.arc(calibration.point1.x, calibration.point1.y, POINT_RADIUS / viewState.zoom, 0, Math.PI * 2);
      ctx.fill();

      if (calibration.point2) {
        ctx.beginPath();
        ctx.moveTo(calibration.point1.x, calibration.point1.y);
        ctx.lineTo(calibration.point2.x, calibration.point2.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(calibration.point2.x, calibration.point2.y, POINT_RADIUS / viewState.zoom, 0, Math.PI * 2);
        ctx.fill();

        const pixelDist = distanceBetweenPoints(calibration.point1, calibration.point2);
        const midX = (calibration.point1.x + calibration.point2.x) / 2;
        const midY = (calibration.point1.y + calibration.point2.y) / 2 - 12 / viewState.zoom;
        ctx.font = `bold ${12 / viewState.zoom}px sans-serif`;
        ctx.fillText(`${pixelDist.toFixed(0)}px — Enter known distance`, midX, midY);
      }

      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [viewState, measurements, activePoints, detectedElements, showOverlays, imageLoaded, pageIndex, selectedMeasurementId, activeTool, calibration]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);
  // =========================================================================
  // COORDINATE CONVERSION
  // =========================================================================

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const sx = screenX - rect.left;
      const sy = screenY - rect.top;

      // Reverse the canvas transforms
      const cx = (sx - viewState.panX - canvas.width / 2) / viewState.zoom + imageRef.current.width / 2;
      const cy = (sy - viewState.panY - canvas.height / 2) / viewState.zoom + imageRef.current.height / 2;

      return { x: cx, y: cy };
    },
    [viewState]
  );

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool === 'pan') {
        setIsDragging(true);
        setDragStart({ x: e.clientX - viewState.panX, y: e.clientY - viewState.panY });
        return;
      }
    },
    [activeTool, viewState]
  );
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging && activeTool === 'pan') {
        setViewState((prev) => ({
          ...prev,
          panX: e.clientX - dragStart.x,
          panY: e.clientY - dragStart.y,
        }));
      }
    },
    [isDragging, activeTool, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool === 'pan' || readOnly) return;

      const point = screenToCanvas(e.clientX, e.clientY);

      if (activeTool === 'calibrate') {
        if (!calibration.point1) {
          setCalibration((prev) => ({ ...prev, isCalibrating: true, point1: point }));
        } else if (!calibration.point2) {
          setCalibration((prev) => ({ ...prev, point2: point }));
          // Prompt for known distance handled in UI
        }
        return;
      }
      if (activeTool === 'count') {
        setCountMarkers((prev) => [...prev, point]);
        return;
      }

      if (activeTool === 'select') {
        // Check if clicking on a detected element
        const clickedElement = detectedElements.find(
          (el) =>
            el.visible &&
            point.x >= el.boundingBox.x &&
            point.x <= el.boundingBox.x + el.boundingBox.width &&
            point.y >= el.boundingBox.y &&
            point.y <= el.boundingBox.y + el.boundingBox.height
        );
        if (clickedElement && onElementClick) {
          onElementClick(clickedElement.id);
        }
        return;
      }

      // Linear or area measurement — add point
      setActivePoints((prev) => [...prev, point]);
    },
    [activeTool, readOnly, screenToCanvas, calibration, detectedElements, onElementClick]
  );
  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'linear' && activePoints.length >= 2) {
      // Complete linear measurement
      let totalPixelDist = 0;
      for (let i = 1; i < activePoints.length; i++) {
        totalPixelDist += distanceBetweenPoints(activePoints[i - 1], activePoints[i]);
      }
      const realDist = totalPixelDist / pixelsPerUnit;

      const newMeasurement: Omit<Measurement, 'id'> = {
        type: 'LINEAR',
        points: [...activePoints],
        value: realDist,
        unit: calibration.unit,
        label: `Linear ${measurements.length + 1}`,
        color: TOOL_COLORS.LINEAR,
        pageIndex,
      };

      const withId = { ...newMeasurement, id: generateId() };
      setMeasurements((prev) => [...prev, withId]);
      onMeasurementAdd?.(newMeasurement);
      setActivePoints([]);
    }

    if (activeTool === 'area' && activePoints.length >= 3) {
      const pixelArea = calculatePolygonArea(activePoints);
      const realArea = pixelArea / (pixelsPerUnit * pixelsPerUnit);
      const newMeasurement: Omit<Measurement, 'id'> = {
        type: 'AREA',
        points: [...activePoints],
        value: realArea,
        unit: `sq ${calibration.unit}`,
        label: `Area ${measurements.length + 1}`,
        color: TOOL_COLORS.AREA,
        pageIndex,
      };

      const withId = { ...newMeasurement, id: generateId() };
      setMeasurements((prev) => [...prev, withId]);
      onMeasurementAdd?.(newMeasurement);
      setActivePoints([]);
    }

    if (activeTool === 'count' && countMarkers.length > 0) {
      const newMeasurement: Omit<Measurement, 'id'> = {
        type: 'COUNT',
        points: [...countMarkers],
        value: countMarkers.length,
        unit: 'ea',
        label: `Count ${measurements.length + 1}`,
        color: TOOL_COLORS.COUNT,
        pageIndex,
      };

      const withId = { ...newMeasurement, id: generateId() };
      setMeasurements((prev) => [...prev, withId]);
      onMeasurementAdd?.(newMeasurement);
      setCountMarkers([]);
    }
  }, [activeTool, activePoints, countMarkers, measurements, pixelsPerUnit, calibration.unit, pageIndex, onMeasurementAdd]);
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setViewState((prev) => ({
        ...prev,
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom + delta)),
      }));
    },
    []
  );

  // =========================================================================
  // ZOOM / ROTATION CONTROLS
  // =========================================================================

  const handleZoomIn = () => setViewState((prev) => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP) }));
  const handleZoomOut = () => setViewState((prev) => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP) }));
  const handleZoomReset = () => {
    if (containerRef.current && imageRef.current) {
      const scaleX = containerRef.current.clientWidth / imageRef.current.width;
      const scaleY = containerRef.current.clientHeight / imageRef.current.height;
      setViewState({ zoom: Math.min(scaleX, scaleY) * 0.95, panX: 0, panY: 0, rotation: 0 });
    }
  };
  const handleRotate = () => setViewState((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  // =========================================================================
  // CALIBRATION COMPLETION
  // =========================================================================

  const handleCalibrationSubmit = (knownDistance: number) => {
    if (calibration.point1 && calibration.point2 && knownDistance > 0) {
      const pixelDist = distanceBetweenPoints(calibration.point1, calibration.point2);
      const ppu = pixelDist / knownDistance;
      setPixelsPerUnit(ppu);
      onCalibrationComplete?.(ppu, calibration.unit);
      setCalibration({ isCalibrating: false, unit: calibration.unit });
      setActiveTool('select');
    }
  };

  // =========================================================================
  // MEASUREMENT MANAGEMENT
  // =========================================================================

  const handleMeasurementSelect = (id: string) => {
    setSelectedMeasurementId(id);
    onMeasurementSelect?.(id);
  };

  const handleMeasurementDelete = (id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    onMeasurementDelete?.(id);
    if (selectedMeasurementId === id) setSelectedMeasurementId(null);
  };
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePoints([]);
        setCountMarkers([]);
        if (calibration.isCalibrating) {
          setCalibration({ isCalibrating: false, unit: calibration.unit });
        }
      }
      if (e.key === 'Delete' && selectedMeasurementId) {
        handleMeasurementDelete(selectedMeasurementId);
      }
      // Tool shortcuts
      if (e.key === 'v') setActiveTool('select');
      if (e.key === 'h') setActiveTool('pan');
      if (e.key === 'l' && !readOnly) setActiveTool('linear');
      if (e.key === 'a' && !readOnly) setActiveTool('area');
      if (e.key === 'c' && !readOnly) setActiveTool('count');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMeasurementId, calibration, readOnly]);
  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className={`flex flex-col bg-gray-950 rounded-lg border border-gray-800 ${className}`}>
      {/* Toolbar */}
      <TakeoffToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onRotate={handleRotate}
        zoom={viewState.zoom}
        readOnly={readOnly}
      />

      <div className="flex flex-1 min-h-0">
        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-crosshair">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm">Loading plan...</p>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            style={{
              cursor: activeTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair',
            }}
          />

          {/* Calibration Input Dialog */}
          {calibration.point1 && calibration.point2 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl z-10">
              <p className="text-sm text-gray-300 mb-2">Enter the known distance between the two points:</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  className="w-32 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  placeholder="Distance"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseFloat((e.target as HTMLInputElement).value);
                      if (val > 0) handleCalibrationSubmit(val);
                    }
                  }}
                />                <select
                  value={calibration.unit}
                  onChange={(e) => setCalibration((prev) => ({ ...prev, unit: e.target.value }))}
                  className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="ft">ft</option>
                  <option value="in">in</option>
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
                <button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('input[type="number"]');
                    if (input) {
                      const val = parseFloat(input.value);
                      if (val > 0) handleCalibrationSubmit(val);
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                >
                  Apply
                </button>
                <button
                  onClick={() => setCalibration({ isCalibrating: false, unit: calibration.unit })}
                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 border-t border-gray-800 px-3 py-1 flex items-center justify-between text-xs text-gray-400">
            <span>
              {activeTool === 'linear' && 'Click to place points, double-click to finish'}
              {activeTool === 'area' && 'Click to place vertices, double-click to close polygon'}
              {activeTool === 'count' && 'Click to place markers, double-click to finish counting'}
              {activeTool === 'calibrate' && 'Click two points of a known distance'}
              {activeTool === 'select' && 'Click to select elements'}
              {activeTool === 'pan' && 'Click and drag to pan'}
            </span>
            <span>
              Scale: {pixelsPerUnit.toFixed(1)} px/{calibration.unit} | Page {pageIndex + 1}
            </span>
          </div>
        </div>

        {/* Right Sidebar — Measurements Panel */}
        <div className="w-64 border-l border-gray-800 bg-gray-900/50 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-200">Measurements</h3>
            <button
              onClick={() => setShowOverlays((prev) => !prev)}
              className={`text-xs px-2 py-0.5 rounded ${showOverlays ? 'bg-blue-600/30 text-blue-400' : 'bg-gray-800 text-gray-500'}`}
            >
              {showOverlays ? 'AI On' : 'AI Off'}
            </button>
          </div>
          <MeasurementPanel
            measurements={measurements.filter((m) => m.pageIndex === pageIndex)}
            selectedId={selectedMeasurementId}
            onSelect={handleMeasurementSelect}
            onDelete={handleMeasurementDelete}
          />

          {/* Summary */}
          <div className="mt-auto border-t border-gray-800 px-3 py-2">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Linear</span>
                <span>{measurements.filter((m) => m.type === 'LINEAR' && m.pageIndex === pageIndex).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Area</span>
                <span>{measurements.filter((m) => m.type === 'AREA' && m.pageIndex === pageIndex).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Count</span>
                <span>{measurements.filter((m) => m.type === 'COUNT' && m.pageIndex === pageIndex).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}