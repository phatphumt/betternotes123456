import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAnnotationActions,
  useAnnotationContext,
  useAnnotationsForPage,
  useAnnotationUIState,
  type Stroke,
  type ToolKind,
} from "./annotationStore";

type Layout = {
  baseWidth: number;
  baseHeight: number;
  fitWidth: number;
  fitHeight: number;
};

type Props = {
  pageNum: number;
  layout: Layout;
  scale: number;
};

type Point = { x: number; y: number; p: number; t: number };
type DragState = { active: boolean; ids: string[]; last: Point | null };

function distance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function strokeHit(stroke: Stroke, target: Point, thresh: number) {
  for (let i = 1; i < stroke.points.length; i++) {
    const p1 = stroke.points[i - 1];
    const p2 = stroke.points[i];
    // project target onto segment
    const vx = p2.x - p1.x;
    const vy = p2.y - p1.y;
    const wx = target.x - p1.x;
    const wy = target.y - p1.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) {
      if (distance(target, p1) <= thresh) return true;
      continue;
    }
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) {
      if (distance(target, p2) <= thresh) return true;
      continue;
    }
    const b = c1 / c2;
    const pbx = p1.x + b * vx;
    const pby = p1.y + b * vy;
    const pdx = target.x - pbx;
    const pdy = target.y - pby;
    const d = Math.sqrt(pdx * pdx + pdy * pdy);
    if (d <= thresh) return true;
  }
  return false;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function PdfAnnotationLayer({ pageNum, layout, scale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { state } = useAnnotationContext();
  const strokes = useAnnotationsForPage(pageNum);
  const {
    addStroke,
    removeStrokes,
    setSelected,
    updateStrokes,
  } = useAnnotationActions();
  const ui = useAnnotationUIState();

  const drawingRef = useRef<{
    currentStroke: Point[] | null;
    tool: ToolKind;
  }>({ currentStroke: null, tool: "pen" });

  const lassoRef = useRef<Point[]>([]);
  const dragRef = useRef<DragState>({ active: false, ids: [], last: null });
const [dragBox, setDragBox] = useState<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);

  const { displayW, displayH, pdfScaleX, pdfScaleY } = useMemo(() => {
    const displayW = layout.fitWidth * scale;
    const displayH = layout.fitHeight * scale;
    const pdfScaleX = layout.baseWidth ? layout.baseWidth / displayW : 1;
    const pdfScaleY = layout.baseHeight ? layout.baseHeight / displayH : 1;
    return { displayW, displayH, pdfScaleX, pdfScaleY };
  }, [layout.baseWidth, layout.baseHeight, layout.fitHeight, layout.fitWidth, scale]);

  // Render strokes onto overlay canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.max(1, Math.floor(displayW));
    canvas.height = Math.max(1, Math.floor(displayH));
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * scale;
      ctx.globalAlpha = stroke.opacity;
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      const p0 = stroke.points[0];
      ctx.moveTo(p0.x / pdfScaleX, p0.y / pdfScaleY);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.x / pdfScaleX, p.y / pdfScaleY);
      }
      ctx.stroke();
      ctx.restore();
    };

    strokes.forEach(drawStroke);

    // draw lasso path for feedback
    if (ui.tool === "lasso" && lassoRef.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = "#0ea5e9";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      const lp0 = lassoRef.current[0];
      ctx.moveTo(lp0.x / pdfScaleX, lp0.y / pdfScaleY);
      for (let i = 1; i < lassoRef.current.length; i++) {
        const p = lassoRef.current[i];
        ctx.lineTo(p.x / pdfScaleX, p.y / pdfScaleY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // dotted bounding box when dragging selection (goodnotes-like)
    if (ui.tool === "lasso" && dragBox) {
      ctx.save();
      ctx.strokeStyle = "#0ea5e9";
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      const w = (dragBox.maxX - dragBox.minX) / pdfScaleX;
      const h = (dragBox.maxY - dragBox.minY) / pdfScaleY;
      ctx.strokeRect(dragBox.minX / pdfScaleX, dragBox.minY / pdfScaleY, w, h);
      ctx.restore();
    }
  }, [displayW, displayH, pdfScaleX, pdfScaleY, strokes, scale, ui.tool, dragBox]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * pdfScaleX;
    const y = (e.clientY - rect.top) * pdfScaleY;
    const p = e.pressure || 0.5;
    const t = performance.now();
    if (ui.tool === "pen" || ui.tool === "highlighter") {
      drawingRef.current.currentStroke = [{ x, y, p, t }];
      drawingRef.current.tool = ui.tool;
      dragRef.current = { active: false, ids: [], last: null };
    } else if (ui.tool === "lasso") {
      // if clicking on selected strokes, start drag instead of new lasso
      const hitSelected = strokes.some(
        (s) => ui.selectedIds.has(s.id) && strokeHit(s, { x, y, p, t }, s.width * 1.2)
      );
      if (hitSelected && ui.selectedIds.size) {
        dragRef.current = { active: true, ids: Array.from(ui.selectedIds), last: { x, y, p, t } };
        lassoRef.current = [];
      } else {
        lassoRef.current = [{ x, y, p, t }];
        dragRef.current = { active: false, ids: [], last: null };
      }
    } else if (ui.tool === "eraser") {
      // eraser immediate check
      const toRemove: string[] = [];
      strokes.forEach((s) => {
        if (strokeHit(s, { x, y, p, t }, s.width * 1.2)) toRemove.push(s.id);
      });
      if (toRemove.length) removeStrokes(pageNum, toRemove);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.hasPointerCapture(e.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * pdfScaleX;
    const y = (e.clientY - rect.top) * pdfScaleY;
    const p = e.pressure || 0.5;
    const t = performance.now();
    if (dragRef.current.active && dragRef.current.last) {
      const dx = x - dragRef.current.last.x;
      const dy = y - dragRef.current.last.y;
      dragRef.current.last = { x, y, p, t };
      if (dx !== 0 || dy !== 0) {
        // Update drag box for visual feedback
        const selected = strokes.filter((s) => dragRef.current.ids.includes(s.id));
        if (selected.length) {
          const allX = selected.flatMap((s) => s.points.map((pt) => pt.x + dx));
          const allY = selected.flatMap((s) => s.points.map((pt) => pt.y + dy));
          setDragBox({
            minX: Math.min(...allX),
            maxX: Math.max(...allX),
            minY: Math.min(...allY),
            maxY: Math.max(...allY),
          });
        }
        updateStrokes(pageNum, dragRef.current.ids, (s) => ({
          ...s,
          points: s.points.map((pt) => ({ ...pt, x: pt.x + dx, y: pt.y + dy })),
          updatedAt: Date.now(),
        }));
      }
    } else if (drawingRef.current.currentStroke) {
      drawingRef.current.currentStroke.push({ x, y, p, t });
      // live preview by drawing to canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const isHL = drawingRef.current.tool === "highlighter";
      ctx.strokeStyle = isHL ? state.highlighterColor : state.color;
      ctx.lineWidth = (isHL ? state.highlighterWidth : state.width) * scale;
      ctx.globalAlpha = isHL ? state.highlighterOpacity : 1;
      const pts = drawingRef.current.currentStroke;
      const prev = pts[pts.length - 2];
      const curr = pts[pts.length - 1];
      if (prev) {
        ctx.beginPath();
        ctx.moveTo(prev.x / pdfScaleX, prev.y / pdfScaleY);
        ctx.lineTo(curr.x / pdfScaleX, curr.y / pdfScaleY);
        ctx.stroke();
      }
      ctx.restore();
    } else if (ui.tool === "lasso" && lassoRef.current.length > 0) {
      lassoRef.current.push({ x, y, p, t });
      // lasso preview handled in render effect
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.hasPointerCapture(e.pointerId)) return;
    canvas.releasePointerCapture(e.pointerId);
    const strokePoints = drawingRef.current.currentStroke;
    if (dragRef.current.active) {
      dragRef.current = { active: false, ids: [], last: null };
      setDragBox(null);
    } else if (strokePoints && strokePoints.length > 1) {
      const isHL = drawingRef.current.tool === "highlighter";
      addStroke(pageNum, {
        type: isHL ? "highlighter" : "pen",
        color: isHL ? state.highlighterColor : state.color,
        width: isHL ? state.highlighterWidth : state.width,
        opacity: isHL ? state.highlighterOpacity : 1,
        points: strokePoints,
      });
    } else if (ui.tool === "lasso" && lassoRef.current.length > 2) {
      const poly = lassoRef.current;
      const hits: string[] = [];
      strokes.forEach((s) => {
        if (s.points.some((pt) => pointInPolygon(pt, poly))) hits.push(s.id);
      });
      setSelected(hits);
    }
    drawingRef.current.currentStroke = null;
    lassoRef.current = [];
    setDragBox(null);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 touch-none"
      style={{ width: `${displayW}px`, height: `${displayH}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

