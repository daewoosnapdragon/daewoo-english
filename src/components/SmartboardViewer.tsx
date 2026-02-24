'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';

interface SmartboardViewerProps {
  resource: Resource & { file_url?: string; thumbnail_url?: string | null };
  allResources?: (Resource & { file_url?: string })[];
  onClose: () => void;
}

type Tool = 'pointer' | 'laser' | 'pen' | 'highlighter' | 'text' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'star' | 'spotlight';
type Stroke = {
  tool: Tool;
  color: string;
  width: number;
  opacity: number;
  points: [number, number][];
  startX?: number; startY?: number; endX?: number; endY?: number;
  text?: string; x?: number; y?: number; fontSize?: number;
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'];
const SIZES = [2, 4, 8, 14, 24];

export default function SmartboardViewer({ resource, allResources, onClose }: SmartboardViewerProps) {
  const [currentResource, setCurrentResource] = useState(resource);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Annotation state
  const [tool, setTool] = useState<Tool>('pointer');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [toolbarMinimized, setToolbarMinimized] = useState(false);

  // Fit mode
  const [fitMode, setFitMode] = useState<'contain' | 'width' | 'page'>('contain');

  // Draggable toolbar
  const [toolbarPos, setToolbarPos] = useState({ x: -1, y: -1 });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Per-resource stroke history
  const [allAnnotations, setAllAnnotations] = useState<Record<string, Stroke[]>>({});
  const [undoneStrokes, setUndoneStrokes] = useState<Record<string, Stroke[]>>({});
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);

  // Laser pointer
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  // Swipe state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const strokes = allAnnotations[currentResource.id] || [];
  const setStrokes = (fn: (prev: Stroke[]) => Stroke[]) => {
    setAllAnnotations(prev => ({
      ...prev,
      [currentResource.id]: fn(prev[currentResource.id] || []),
    }));
  };

  // Initialize toolbar position (centered at top)
  useEffect(() => {
    if (toolbarPos.x === -1) {
      setToolbarPos({ x: Math.max(0, (window.innerWidth - 500) / 2), y: 60 });
    }
  }, []);

  // Find index in allResources
  useEffect(() => {
    if (allResources?.length) {
      const idx = allResources.findIndex(r => r.id === resource.id);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [resource.id, allResources]);

  const navigate = useCallback((dir: 1 | -1) => {
    if (!allResources?.length) return;
    const next = currentIndex + dir;
    if (next >= 0 && next < allResources.length) {
      setCurrentIndex(next);
      setCurrentResource(allResources[next] as any);
      setTextInput(null);
      setSwipeOffset(0);
    }
  }, [currentIndex, allResources]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (textInput) return;
      if (e.key === 'Escape') { if (showToolbar) { setShowToolbar(false); setTool('pointer'); } else onClose(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1);
      if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.();
      if (e.key === 'p' || e.key === 'P') { setTool('pen'); setShowToolbar(true); }
      if (e.key === 'h' || e.key === 'H') { setTool('highlighter'); setShowToolbar(true); }
      if (e.key === 'e' || e.key === 'E') { setTool('eraser'); setShowToolbar(true); }
      if (e.key === 't' || e.key === 'T') { setTool('text'); setShowToolbar(true); }
      if (e.key === 'l' || e.key === 'L') { setTool('laser'); setShowToolbar(true); }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onClose, showToolbar, textInput, currentResource.id]);

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [currentResource.id]);

  // Redraw
  useEffect(() => { redraw(); }, [strokes, currentStroke]);

  // Toolbar drag handlers
  const handleToolbarDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDraggingToolbar(true);
    setDragOffset({ x: clientX - toolbarPos.x, y: clientY - toolbarPos.y });
  };

  useEffect(() => {
    if (!isDraggingToolbar) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setToolbarPos({
        x: Math.max(0, Math.min(window.innerWidth - 100, clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, clientY - dragOffset.y)),
      });
    };
    const handleUp = () => setIsDraggingToolbar(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDraggingToolbar, dragOffset]);

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allToDraw = [...strokes];
    if (currentStroke) allToDraw.push(currentStroke);

    for (const s of allToDraw) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = s.width * 3;
      } else if (s.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width * 4;
        ctx.globalAlpha = 0.35;
      } else if (s.tool === 'text' && s.text) {
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = s.color;
        ctx.font = `bold ${s.fontSize || 24}px system-ui, sans-serif`;
        ctx.fillText(s.text, s.x || 0, s.y || 0);
        ctx.restore();
        continue;
      } else if (s.tool === 'arrow' && s.startX != null) {
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.opacity;
        const ex = s.endX ?? s.startX;
        const ey = s.endY ?? s.startY!;
        // Line
        ctx.beginPath();
        ctx.moveTo(s.startX, s.startY!);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(ey - s.startY!, ex - s.startX);
        const headLen = Math.max(s.width * 3, 12);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      } else if (s.tool === 'line' && s.startX != null) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.opacity;
        ctx.beginPath();
        ctx.moveTo(s.startX, s.startY!);
        ctx.lineTo(s.endX || s.startX, s.endY || s.startY!);
        ctx.stroke();
        ctx.restore();
        continue;
      } else if (s.tool === 'rect' && s.startX != null) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.opacity;
        ctx.strokeRect(s.startX, s.startY!, (s.endX || s.startX) - s.startX, (s.endY || s.startY!) - s.startY!);
        ctx.restore();
        continue;
      } else if (s.tool === 'circle' && s.startX != null) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.opacity;
        const rx = ((s.endX || s.startX) - s.startX) / 2;
        const ry = ((s.endY || s.startY!) - s.startY!) / 2;
        ctx.beginPath();
        ctx.ellipse(s.startX + rx, s.startY! + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      } else if (s.tool === 'star' && s.startX != null) {
        ctx.strokeStyle = s.color;
        ctx.fillStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.opacity;
        const cx = (s.startX + (s.endX || s.startX)) / 2;
        const cy = (s.startY! + (s.endY || s.startY!)) / 2;
        const r = Math.max(Math.abs((s.endX || s.startX) - s.startX), Math.abs((s.endY || s.startY!) - s.startY!)) / 2;
        drawStar(ctx, cx, cy, 5, r, r * 0.45);
        ctx.stroke();
        ctx.restore();
        continue;
      } else if (s.tool === 'spotlight' && s.startX != null) {
        // Spotlight: dim everything except the selected region
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const x1 = Math.min(s.startX, s.endX || s.startX);
        const y1 = Math.min(s.startY!, s.endY || s.startY!);
        const w = Math.abs((s.endX || s.startX) - s.startX);
        const h = Math.abs((s.endY || s.startY!) - s.startY!);
        ctx.clearRect(x1, y1, w, h);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, w, h);
        ctx.restore();
        continue;
      } else {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.globalAlpha = s.opacity;
      }

      if (s.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(s.points[0][0], s.points[0][1]);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i][0], s.points[i][1]);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Laser pointer
    if (laserPos && tool === 'laser') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(laserPos.x, laserPos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(laserPos.x, laserPos.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  function getPos(e: React.MouseEvent | React.TouchEvent): [number, number] {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return [clientX - rect.left, clientY - rect.top];
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (tool === 'pointer') {
      // Touch swipe detection for pointer mode
      if ('touches' in e) {
        const t = e.touches[0];
        setTouchStart({ x: t.clientX, y: t.clientY, time: Date.now() });
      }
      return;
    }
    if (tool === 'laser') {
      const [x, y] = getPos(e);
      setLaserPos({ x, y });
      return;
    }
    if (tool === 'text') {
      const [x, y] = getPos(e);
      setTextInput({ x, y });
      return;
    }

    e.preventDefault();
    const [x, y] = getPos(e);
    const isShape = ['line', 'arrow', 'rect', 'circle', 'star', 'spotlight'].includes(tool);

    setIsDrawing(true);
    setCurrentStroke({
      tool, color, width: strokeWidth,
      opacity: tool === 'highlighter' ? 0.35 : 1,
      points: isShape ? [] : [[x, y]],
      ...(isShape ? { startX: x, startY: y, endX: x, endY: y } : {}),
    });
  }

  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    // Laser pointer tracking
    if (tool === 'laser') {
      const [x, y] = getPos(e);
      setLaserPos({ x, y });
      redraw();
      return;
    }

    // Swipe tracking in pointer mode
    if (tool === 'pointer' && touchStart && 'touches' in e) {
      const dx = e.touches[0].clientX - touchStart.x;
      setSwipeOffset(dx);
      return;
    }

    if (!isDrawing || !currentStroke) return;
    e.preventDefault();
    const [x, y] = getPos(e);
    const isShape = ['line', 'arrow', 'rect', 'circle', 'star', 'spotlight'].includes(tool);

    if (isShape) {
      setCurrentStroke(prev => prev ? { ...prev, endX: x, endY: y } : null);
    } else {
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, [x, y]] } : null);
    }
  }

  function handlePointerUp(e?: React.MouseEvent | React.TouchEvent) {
    // Swipe navigation in pointer mode
    if (tool === 'pointer' && touchStart) {
      const elapsed = Date.now() - touchStart.time;
      if (Math.abs(swipeOffset) > 60 && elapsed < 500) {
        navigate(swipeOffset < 0 ? 1 : -1);
      }
      setTouchStart(null);
      setSwipeOffset(0);
      return;
    }

    if (tool === 'laser') {
      setLaserPos(null);
      redraw();
      return;
    }

    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    const hasContent = currentStroke.points.length > 1 ||
      (currentStroke.startX != null && (Math.abs((currentStroke.endX || 0) - currentStroke.startX) > 3 || Math.abs((currentStroke.endY || 0) - (currentStroke.startY || 0)) > 3));
    if (hasContent) {
      setStrokes(prev => [...prev, currentStroke]);
      setUndoneStrokes(prev => ({ ...prev, [currentResource.id]: [] }));
    }
    setCurrentStroke(null);
  }

  function handleTextSubmit(text: string) {
    if (!textInput || !text.trim()) { setTextInput(null); return; }
    const newStroke: Stroke = {
      tool: 'text', color, width: strokeWidth, opacity: 1,
      points: [], text: text.trim(),
      x: textInput.x, y: textInput.y,
      fontSize: strokeWidth * 6,
    };
    setStrokes(prev => [...prev, newStroke]);
    setUndoneStrokes(prev => ({ ...prev, [currentResource.id]: [] }));
    setTextInput(null);
  }

  function handleUndo() {
    const current = allAnnotations[currentResource.id] || [];
    if (!current.length) return;
    const last = current[current.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setUndoneStrokes(prev => ({
      ...prev,
      [currentResource.id]: [...(prev[currentResource.id] || []), last],
    }));
  }

  function handleRedo() {
    const undone = undoneStrokes[currentResource.id] || [];
    if (!undone.length) return;
    const last = undone[undone.length - 1];
    setStrokes(prev => [...prev, last]);
    setUndoneStrokes(prev => ({
      ...prev,
      [currentResource.id]: (prev[currentResource.id] || []).slice(0, -1),
    }));
  }

  function handleClear() {
    setStrokes(() => []);
    setUndoneStrokes(prev => ({ ...prev, [currentResource.id]: [] }));
  }

  const isPdf = currentResource.file_type === 'pdf';
  const isImage = ['image', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(currentResource.file_type || '');
  const fileUrl = currentResource.file_url;
  const hasNav = allResources && allResources.length > 1;
  const isAnnotating = tool !== 'pointer';
  const hasStrokes = strokes.length > 0;

  const TOOL_GROUPS: { label: string; tools: { id: Tool; icon: string; label: string; shortcut: string }[] }[] = [
    {
      label: 'Navigate', tools: [
        { id: 'pointer', icon: 'near_me', label: 'Pointer', shortcut: 'Esc' },
        { id: 'laser', icon: 'flashlight_on', label: 'Laser', shortcut: 'L' },
      ]
    },
    {
      label: 'Draw', tools: [
        { id: 'pen', icon: 'edit', label: 'Pen', shortcut: 'P' },
        { id: 'highlighter', icon: 'highlight', label: 'Highlight', shortcut: 'H' },
        { id: 'text', icon: 'title', label: 'Text', shortcut: 'T' },
        { id: 'eraser', icon: 'ink_eraser', label: 'Eraser', shortcut: 'E' },
      ]
    },
    {
      label: 'Shapes', tools: [
        { id: 'line', icon: 'horizontal_rule', label: 'Line', shortcut: '' },
        { id: 'arrow', icon: 'north_east', label: 'Arrow', shortcut: '' },
        { id: 'rect', icon: 'crop_square', label: 'Rectangle', shortcut: '' },
        { id: 'circle', icon: 'circle', label: 'Circle', shortcut: '' },
        { id: 'star', icon: 'star', label: 'Star', shortcut: '' },
        { id: 'spotlight', icon: 'center_focus_strong', label: 'Spotlight', shortcut: '' },
      ]
    },
  ];

  // Get fit mode styles for content
  const getContentStyle = (): React.CSSProperties => {
    if (fitMode === 'width') return { width: '100%', height: 'auto', objectFit: 'contain' as const };
    if (fitMode === 'page') return { width: '100%', height: '100%', objectFit: 'fill' as const };
    return { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">

      {/* Top bar — always visible, slim */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="bg-gradient-to-b from-black/80 to-transparent px-3 py-2 flex items-center gap-2">
          <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
            <Icon name="close" size={18} className="text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{currentResource.title}</p>
            <p className="text-white/40 text-[10px]">
              {currentResource.resource_type}
              {hasNav && ` · ${currentIndex + 1}/${allResources!.length}`}
            </p>
          </div>

          {/* Fit mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            {(['contain', 'width', 'page'] as const).map(fm => (
              <button key={fm} onClick={() => setFitMode(fm)}
                className={`px-2 py-1 text-[9px] font-bold ${fitMode === fm ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}
                title={fm === 'contain' ? 'Fit to screen' : fm === 'width' ? 'Fit width' : 'Fill page'}>
                {fm === 'contain' ? '⊡' : fm === 'width' ? '↔' : '⬜'}
              </button>
            ))}
          </div>

          {/* Annotation toggle */}
          <button onClick={() => { setShowToolbar(!showToolbar); if (showToolbar) { setTool('pointer'); setLaserPos(null); } }}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur transition-colors ${
              showToolbar ? 'bg-red-500/80 hover:bg-red-500' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Annotate">
            <Icon name="draw" size={18} className="text-white" />
          </button>

          <button onClick={() => document.documentElement.requestFullscreen?.()}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur"
            title="Fullscreen (F)">
            <Icon name="fullscreen" size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Floating draggable annotation toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-40 select-none"
          style={{ left: toolbarPos.x, top: toolbarPos.y }}
        >
          {toolbarMinimized ? (
            /* Minimized: just a small pill */
            <div className="bg-gray-900/95 backdrop-blur rounded-full px-3 py-2 shadow-2xl border border-white/10 flex items-center gap-2 cursor-move"
              onMouseDown={handleToolbarDragStart} onTouchStart={handleToolbarDragStart}>
              <div className="w-4 h-4 rounded-full border-2 border-white/40" style={{ backgroundColor: color }} />
              <span className="text-white/60 text-[10px] font-bold">{TOOL_GROUPS.flatMap(g => g.tools).find(t => t.id === tool)?.label}</span>
              <button onClick={(e) => { e.stopPropagation(); setToolbarMinimized(false); }}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <Icon name="expand_more" size={14} className="text-white" />
              </button>
            </div>
          ) : (
            /* Full toolbar */
            <div className="bg-gray-900/95 backdrop-blur rounded-2xl shadow-2xl border border-white/10 overflow-hidden" style={{ minWidth: 280 }}>
              {/* Drag handle + minimize */}
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white/5 cursor-move border-b border-white/10"
                onMouseDown={handleToolbarDragStart} onTouchStart={handleToolbarDragStart}>
                <Icon name="drag_indicator" size={14} className="text-white/30" />
                <span className="text-[9px] text-white/40 font-bold uppercase flex-1">Annotation Tools</span>
                <button onClick={(e) => { e.stopPropagation(); setToolbarMinimized(true); }}
                  className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center">
                  <Icon name="remove" size={12} className="text-white/50" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowToolbar(false); setTool('pointer'); setLaserPos(null); }}
                  className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center">
                  <Icon name="close" size={12} className="text-white/50" />
                </button>
              </div>

              <div className="p-2 space-y-1.5">
                {TOOL_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-[8px] text-white/30 uppercase font-bold px-1 mb-0.5">{group.label}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {group.tools.map(t => (
                        <button key={t.id} onClick={() => { setTool(t.id); if (t.id !== 'laser') setLaserPos(null); }}
                          title={`${t.label}${t.shortcut ? ` (${t.shortcut})` : ''}`}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            tool === t.id
                              ? 'bg-white text-gray-900 shadow-lg'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}>
                          <Icon name={t.icon} size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Color + Size row */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <div className="relative">
                    <button onClick={() => { setShowColorPicker(!showColorPicker); setShowSizePicker(false); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" title="Color">
                      <div className="w-5 h-5 rounded-full border-2 border-white/50" style={{ backgroundColor: color }} />
                    </button>
                    {showColorPicker && (
                      <div className="absolute bottom-full mb-1 left-0 bg-gray-900/95 backdrop-blur rounded-xl p-2 shadow-2xl border border-white/10 flex gap-1.5 z-50">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => { setColor(c); setShowColorPicker(false); }}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110' : 'border-white/20'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button onClick={() => { setShowSizePicker(!showSizePicker); setShowColorPicker(false); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" title="Size">
                      <div className="rounded-full bg-white" style={{ width: Math.min(strokeWidth + 4, 18), height: Math.min(strokeWidth + 4, 18) }} />
                    </button>
                    {showSizePicker && (
                      <div className="absolute bottom-full mb-1 left-0 bg-gray-900/95 backdrop-blur rounded-xl p-2 shadow-2xl border border-white/10 flex items-center gap-2 z-50">
                        {SIZES.map(s => (
                          <button key={s} onClick={() => { setStrokeWidth(s); setShowSizePicker(false); }}
                            className={`rounded-full bg-white transition-transform hover:scale-110 ${strokeWidth === s ? 'ring-2 ring-blue-400' : ''}`}
                            style={{ width: s + 6, height: s + 6 }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1" />

                  {/* Undo/Redo/Clear */}
                  <button onClick={handleUndo} disabled={!hasStrokes}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 disabled:opacity-30" title="Undo">
                    <Icon name="undo" size={16} />
                  </button>
                  <button onClick={handleRedo} disabled={!(undoneStrokes[currentResource.id]?.length)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 disabled:opacity-30" title="Redo">
                    <Icon name="redo" size={16} />
                  </button>
                  <button onClick={handleClear} disabled={!hasStrokes}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 disabled:opacity-30" title="Clear">
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content area */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ transform: swipeOffset ? `translateX(${swipeOffset * 0.3}px)` : undefined, transition: swipeOffset ? 'none' : 'transform 0.2s' }}>

        {/* Document/Image layer */}
        {isPdf && fileUrl ? (
          <iframe
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="border-0"
            style={{
              background: 'white',
              pointerEvents: isAnnotating ? 'none' : 'auto',
              ...(fitMode === 'contain' ? { width: '100%', height: '100%' } :
                fitMode === 'width' ? { width: '100%', height: '100%' } :
                { width: '100%', height: '100%' }),
            }}
          />
        ) : isImage && fileUrl ? (
          <img src={fileUrl} alt={currentResource.title}
            style={{ ...getContentStyle(), pointerEvents: isAnnotating ? 'none' : 'auto' }} />
        ) : currentResource.thumbnail_url ? (
          <img src={currentResource.thumbnail_url} alt={currentResource.title}
            style={getContentStyle()} />
        ) : (
          <div className="text-center">
            <Icon name="description" size={64} className="text-white/30 mx-auto mb-4" />
            <p className="text-white/50">Preview not available</p>
          </div>
        )}

        {/* Canvas annotation overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${isAnnotating ? (tool === 'laser' ? 'cursor-none' : 'cursor-crosshair') : ''}`}
          style={{ touchAction: 'none', pointerEvents: isAnnotating || tool === 'pointer' ? 'auto' : 'none' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => { if (tool === 'laser') { setLaserPos(null); redraw(); } else handlePointerUp(); }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Text input overlay */}
        {textInput && (
          <div className="absolute z-40" style={{ left: textInput.x, top: textInput.y }}>
            <input
              autoFocus
              className="bg-transparent border-b-2 text-white font-bold outline-none min-w-[120px]"
              style={{ borderColor: color, color, fontSize: strokeWidth * 6 }}
              placeholder="Type..."
              onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit((e.target as HTMLInputElement).value); if (e.key === 'Escape') setTextInput(null); }}
              onBlur={e => handleTextSubmit(e.target.value)}
            />
          </div>
        )}

        {/* Nav arrows (pointer mode only) */}
        {hasNav && tool === 'pointer' && (
          <>
            <button onClick={() => navigate(-1)} disabled={currentIndex === 0}
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center backdrop-blur ${currentIndex === 0 ? 'opacity-20' : ''}`}>
              <Icon name="chevron_left" size={24} className="text-white" />
            </button>
            <button onClick={() => navigate(1)} disabled={currentIndex === (allResources!.length - 1)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center backdrop-blur ${currentIndex === (allResources!.length - 1) ? 'opacity-20' : ''}`}>
              <Icon name="chevron_right" size={24} className="text-white" />
            </button>
          </>
        )}

        {/* Active tool indicator */}
        {isAnnotating && !showToolbar && (
          <div className="absolute bottom-4 left-4 bg-red-500/80 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {TOOL_GROUPS.flatMap(g => g.tools).find(t => t.id === tool)?.label || 'Drawing'}
            <button onClick={() => { setTool('pointer'); setLaserPos(null); }} className="ml-1 hover:text-white/80">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {/* Stroke count badge */}
        {hasStrokes && tool === 'pointer' && (
          <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur text-white/60 text-[10px] px-2 py-1 rounded-full">
            {strokes.length} annotation{strokes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Bottom resource strip */}
      {hasNav && tool === 'pointer' && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-gradient-to-t from-black/70 to-transparent px-6 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allResources!.map((r, i) => (
                <button key={r.id} onClick={() => { setCurrentIndex(i); setCurrentResource(r as any); setTextInput(null); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                    i === currentIndex
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}>
                  {r.title.length > 25 ? r.title.slice(0, 25) + '…' : r.title}
                  {(allAnnotations[r.id]?.length || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-black" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
