'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';

interface SmartboardViewerProps {
  resource: Resource & { file_url?: string; thumbnail_url?: string | null };
  onClose: () => void;
}

type Tool = 'pointer' | 'pen' | 'highlighter' | 'text' | 'eraser';
type Stroke = { tool: Tool; color: string; width: number; opacity: number; points: [number, number][]; text?: string; x?: number; y?: number; fontSize?: number; };

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'];
const SIZES = [2, 4, 8, 14];

export default function SmartboardViewer({ resource, onClose }: SmartboardViewerProps) {
  const [tool, setTool] = useState<Tool>('pointer');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [fitMode, setFitMode] = useState<'fit' | 'width'>('fit');
  const [zoom, setZoom] = useState(100);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isAnnotating = tool !== 'pointer';
  const isPdf = resource.file_type === 'pdf' || resource.storage_path?.endsWith('.pdf');
  const isImage = ['image', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(resource.file_type || '');
  const fileUrl = (resource as any).file_url;
  const pdfView = fitMode === 'fit' ? 'Fit' : 'FitH';
  const pdfZoom = zoom !== 100 ? `&zoom=${zoom}` : '';
  const pdfSrc = isPdf && fileUrl ? `${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=${pdfView}${pdfZoom}` : '';

  // Keyboard — arrows scroll the PDF, no resource switching
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (textInput) return;
      if (e.key === 'Escape') { if (isAnnotating) setTool('pointer'); else onClose(); }
      // Arrow keys scroll the PDF iframe content
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        try { iframeRef.current?.contentWindow?.scrollBy(0, 300); } catch {}
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        try { iframeRef.current?.contentWindow?.scrollBy(0, -300); } catch {}
      }
      if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.();
      if (e.key === 'p' || e.key === 'P') setTool('pen');
      if (e.key === 'h' || e.key === 'H') setTool('highlighter');
      if (e.key === 'e' || e.key === 'E') setTool('eraser');
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, isAnnotating, textInput]);

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => { canvas.width = container.clientWidth; canvas.height = container.clientHeight; redraw(); };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => { redraw(); }, [strokes, currentStroke]);

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of [...strokes, ...(currentStroke ? [currentStroke] : [])]) {
      if (s.tool === 'text' && s.text) {
        ctx.font = `bold ${s.fontSize || 24}px sans-serif`;
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, s.x || 0, s.y || 0);
      } else if (s.points.length > 1) {
        ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = s.opacity;
        ctx.moveTo(s.points[0][0], s.points[0][1]);
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0], s.points[i][1]);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }

  function getPos(e: any): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = e.touches?.[0];
    return [(touch?.clientX || e.clientX) - rect.left, (touch?.clientY || e.clientY) - rect.top];
  }

  function handlePointerDown(e: any) {
    if (!isAnnotating) return; e.preventDefault();
    if (tool === 'text') { const [x, y] = getPos(e); setTextInput({ x, y }); return; }
    const [x, y] = getPos(e); setIsDrawing(true);
    if (tool === 'eraser') {
      const r = strokeWidth * 3;
      setStrokes(prev => prev.filter(s => s.tool === 'text' || !s.points.some(p => Math.hypot(p[0] - x, p[1] - y) < r)));
    } else {
      setCurrentStroke({ tool, color, width: strokeWidth, opacity: tool === 'highlighter' ? 0.4 : 1, points: [[x, y]] });
    }
  }

  function handlePointerMove(e: any) {
    if (!isDrawing || !currentStroke) return; e.preventDefault();
    const [x, y] = getPos(e);
    if (tool === 'eraser') {
      const r = strokeWidth * 3;
      setStrokes(prev => prev.filter(s => s.tool === 'text' || !s.points.some(p => Math.hypot(p[0] - x, p[1] - y) < r)));
    } else { setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, [x, y]] } : null); }
  }

  function handlePointerUp() {
    if (!isDrawing) return; setIsDrawing(false);
    if (currentStroke && currentStroke.points.length > 1) { setStrokes(prev => [...prev, currentStroke]); setUndoneStrokes([]); }
    setCurrentStroke(null);
  }

  function handleTextSubmit(text: string) {
    if (text && textInput) setStrokes(prev => [...prev, { tool: 'text', color, width: strokeWidth, opacity: 1, points: [], text, x: textInput.x, y: textInput.y, fontSize: strokeWidth * 6 }]);
    setTextInput(null);
  }

  function handleUndo() {
    setStrokes(prev => { if (!prev.length) return prev; setUndoneStrokes(u => [...u, prev[prev.length - 1]]); return prev.slice(0, -1); });
  }

  function handleRedo() {
    if (!undoneStrokes.length) return;
    setStrokes(prev => [...prev, undoneStrokes[undoneStrokes.length - 1]]);
    setUndoneStrokes(prev => prev.slice(0, -1));
  }

  return (
    <div className="fixed inset-0 z-[60] bg-cyber-surface flex" data-presenting>
      {/* LEFT TOOLBAR */}
      <div className="w-14 bg-gradient-to-b from-vault-900 to-vault-950 flex flex-col items-center py-3 gap-1 flex-shrink-0 border-r border-cyber-border">
        <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-cyber-surface/20 mb-2" title="Close (Esc)">
          <Icon name="close" size={20} />
        </button>

        {/* View controls */}
        <button onClick={() => setFitMode(fitMode === 'fit' ? 'width' : 'fit')}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-cyber-surface/20" title="Toggle fit">
          <Icon name={fitMode === 'fit' ? 'fit_screen' : 'width_full'} size={18} />
        </button>
        <button onClick={() => setZoom(Math.min(zoom + 25, 300))}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-cyber-surface/20"><Icon name="zoom_in" size={18} /></button>
        {zoom !== 100 && <span className="text-[8px] text-white/40 font-bold">{zoom}%</span>}
        <button onClick={() => setZoom(Math.max(zoom - 25, 50))}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-cyber-surface/20"><Icon name="zoom_out" size={18} /></button>
        <button onClick={() => document.documentElement.requestFullscreen?.()}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-cyber-surface/20"><Icon name="fullscreen" size={18} /></button>

        <div className="border-t border-cyber-border w-8 my-1" />

        {/* Drawing tools */}
        {([
          { t: 'pointer' as Tool, icon: 'near_me', label: 'Pointer' },
          { t: 'pen' as Tool, icon: 'edit', label: 'Pen (P)' },
          { t: 'highlighter' as Tool, icon: 'highlight', label: 'Highlight (H)' },
          { t: 'text' as Tool, icon: 'text_fields', label: 'Text' },
          { t: 'eraser' as Tool, icon: 'auto_fix_high', label: 'Eraser (E)' },
        ]).map(({ t, icon, label }) => (
          <button key={t} onClick={() => setTool(t)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              tool === t ? 'bg-gradient-to-r from-vault-400 to-kawaii-500 text-white' : 'text-white/60 hover:bg-cyber-surface/20'
            }`} title={label}><Icon name={icon} size={18} /></button>
        ))}

        {isAnnotating && (<>
          <div className="border-t border-cyber-border w-8 my-1" />
          <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-cyber-surface/20 relative">
            <div className="w-5 h-5 rounded-full border-2 border-white/40" style={{ background: color }} />
          </button>
          {showColorPicker && (
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-cyber-surface rounded-xl p-2 shadow-xl border border-cyber-border z-50">
              <div className="grid grid-cols-3 gap-1.5">
                {COLORS.map(c => (<button key={c} onClick={() => { setColor(c); setShowColorPicker(false); }}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-cyber-border'}`} style={{ background: c }} />))}
              </div>
              <div className="mt-2 flex gap-1">
                {SIZES.map(s => (<button key={s} onClick={() => setStrokeWidth(s)}
                  className={`flex-1 h-6 rounded flex items-center justify-center ${strokeWidth === s ? 'bg-white/20' : 'hover:bg-cyber-surface/20'}`}>
                  <div className="rounded-full bg-white" style={{ width: s + 2, height: s + 2 }} /></button>))}
              </div>
            </div>
          )}
          <button onClick={handleUndo} disabled={!strokes.length} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:bg-cyber-surface/20 disabled:opacity-20"><Icon name="undo" size={18} /></button>
          <button onClick={handleRedo} disabled={!undoneStrokes.length} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:bg-cyber-surface/20 disabled:opacity-20"><Icon name="redo" size={18} /></button>
          <button onClick={() => setStrokes([])} disabled={!strokes.length} className="w-10 h-10 rounded-xl flex items-center justify-center text-cyber-fg/60 hover:bg-cyber-surface/20 disabled:opacity-20"><Icon name="delete" size={18} /></button>
        </>)}

        <div className="flex-1" />
      </div>

      {/* MAIN CONTENT — single resource only */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
        {isPdf && fileUrl ? (<>
          {!pdfLoaded && (
            <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center bg-cyber-surface">
              <div className="w-8 h-8 border-2 border-cyber-border/30 border-t-vault-400 rounded-full animate-spin mb-4" />
              <p className="text-cyber-fg text-sm font-medium">wait please i'm trying my best ;(</p>
            </div>
          )}
          <iframe ref={iframeRef} src={pdfSrc} className="w-full h-full border-0" style={{ background: 'white', pointerEvents: isAnnotating ? 'none' : 'auto' }}
            onLoad={() => setPdfLoaded(true)} />
        </>) : isImage && fileUrl ? (
          <img src={fileUrl} alt={resource.title} className="max-w-full max-h-full object-contain"
            style={{ pointerEvents: isAnnotating ? 'none' : 'auto', transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined }} />
        ) : (
          <div className="text-center">
            <Icon name="description" size={64} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">Preview not available</p>
          </div>
        )}

        {/* Canvas overlay for annotations */}
        <canvas ref={canvasRef} className={`absolute inset-0 ${isAnnotating ? 'cursor-crosshair' : 'pointer-events-none'}`}
          style={{ touchAction: 'none' }}
          onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp} />

        {textInput && (
          <div className="absolute z-40" style={{ left: textInput.x, top: textInput.y }}>
            <input autoFocus className="bg-transparent border-b-2 font-bold outline-none min-w-[120px]"
              style={{ borderColor: color, color, fontSize: strokeWidth * 6 }} placeholder="Type..."
              onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit((e.target as HTMLInputElement).value); if (e.key === 'Escape') setTextInput(null); }}
              onBlur={e => handleTextSubmit(e.target.value)} />
          </div>
        )}

        {/* Resource title */}
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
          <p className="text-white/50 text-[11px] font-medium truncate bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5 inline-block">
            {resource.title}
          </p>
        </div>

        {isAnnotating && (
          <div className="absolute bottom-3 left-3 bg-cyber-fg/80 backdrop-blur text-black text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" /> Drawing
          </div>
        )}
      </div>
    </div>
  );
}
