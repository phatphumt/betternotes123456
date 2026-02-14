import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pen as PenIcon, Square, Trash2, MousePointer, Eraser, ClipboardList, WalletCards } from "lucide-react";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import GenerateQuizModal from "@/components/GenerateQuizModal";
import GenerateFlashcardModal from "@/components/GenerateFlashcardModal";
import type { GenerateQuizResponse, GenerateFlashcardResponse } from "@/lib/aiService";

type Point = { x: number; y: number };
type BBox = { minX: number; minY: number; maxX: number; maxY: number };
export type Stroke = {
id: string;
tool: "pen" | "highlighter";
color: "black" | "red" | "blue";
width: number;
alpha: number;
points: Point[];
bbox: BBox;
};

const PAPER_BASE_WIDTH = 900;
const PAPER_BASE_HEIGHT = 1200;

function capitalizeWords(s: string) {
return s
  .replace(/[-_]/g, " ")
  .split(" ")
  .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
  .join(" ");
}

export default function NoteCanvas() {
const { noteId = "untitled" } = useParams<{ noteId: string }>();
const navigate = useNavigate();

const [showSearch, setShowSearch] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const searchInputRef = useRef<HTMLInputElement>(null);

const [scale, setScale] = useState<number>(1);
const minScale = 0.25;
const maxScale = 5;
const scaleStep = 0.1;

const containerRef = useRef<HTMLDivElement | null>(null);
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const overlayRef = useRef<HTMLDivElement | null>(null);

const [paperWidth, setPaperWidth] = useState<number>(PAPER_BASE_WIDTH);
const [paperHeight, setPaperHeight] = useState<number>(PAPER_BASE_HEIGHT);

const [strokes, setStrokes] = useState<Stroke[]>([]);
const strokesRef = useRef<Stroke[]>([]);
strokesRef.current = strokes;

const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [tool, setTool] = useState<"pen" | "highlighter" | "eraser" | "select">("pen");
const [color, setColor] = useState<"black" | "red" | "blue">("black");
const [thickness, setThickness] = useState<number>(3); // thin/medium/thick -> 2/4/8 mapped later

const [loading, setLoading] = useState(true);
const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

const saveTimeoutRef = useRef<number | null>(null);
const isPointerDownRef = useRef(false);

// Drawing in-progress
const currentStrokeRef = useRef<Stroke | null>(null);

// Selection rect
const selStartRef = useRef<Point | null>(null);
const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

// Generate Quiz Modal
const [showGenerateModal, setShowGenerateModal] = useState(false);

// Generate Flashcard Modal
const [showGenerateFlashcardModal, setShowGenerateFlashcardModal] = useState(false);

// load & persist
const storageKey = `note:${noteId}`;

useEffect(() => {
  // load from localStorage
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { strokes: Stroke[]; lastEdited?: number; settings?: any };
      if (Array.isArray(parsed.strokes)) {
        setStrokes(parsed.strokes);
      }
      if (parsed.lastEdited) setLastSavedTime(parsed.lastEdited);
    }
  } catch (e) {
    // ignore parse errors
  } finally {
    // small delay to show spinner briefly
    setTimeout(() => setLoading(false), 120);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [noteId]);

// Save with debounce
const persist = useCallback(() => {
  const payload = {
    strokes,
    lastEdited: Date.now(),
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
    setLastSavedTime(payload.lastEdited);
  } catch (e) {
    // ignore
  }
}, [strokes, storageKey]);

useEffect(() => {
  if (saveTimeoutRef.current) {
    window.clearTimeout(saveTimeoutRef.current);
  }
  saveTimeoutRef.current = window.setTimeout(() => {
    persist();
    saveTimeoutRef.current = null;
  }, 300);
  return () => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
  };
}, [strokes, persist]);

// Undo handler - clear last stroke
const doUndo = useCallback(() => {
  setStrokes((s) => {
    if (s.length === 0) return s;
    return s.slice(0, -1);
  });
}, []);

// Redo not implemented - user can clear all with Delete button
const doRedo = useCallback(() => {
  // No-op for now
}, []);

// ResizeObserver to size paper responsively
useLayoutEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  const ro = new ResizeObserver(() => {
    const cw = container.clientWidth;
    // Leave some padding; paper should fit nicely
    const maxPaperWidth = Math.min(PAPER_BASE_WIDTH, Math.max(480, cw - 80));
    const width = maxPaperWidth;
    const height = (PAPER_BASE_HEIGHT / PAPER_BASE_WIDTH) * width;
    setPaperWidth(width);
    setPaperHeight(height);
  });
  ro.observe(container);
  return () => ro.disconnect();
}, []);

// Draw function
const drawAll = useCallback(
  (targetCtx?: CanvasRenderingContext2D | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = targetCtx ?? canvas.getContext("2d");
    if (!ctx) return;
    // Canvas element size is already set elsewhere; here we clear and draw in logical paper space
    ctx.save();
    // Reset transform since we'll use logical coords (1:1) and canvas has been scaled beforehand
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // clear with transparent then paint cream background in logical space
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // If drawing on onscreen canvas where we set a transform that maps to logical coords,
    // ensure we fill entire canvas. We'll fill using scaled transform for correctness below.
    // We'll apply scale to map logical units to pixel units (handled by canvas sizing).
    // For simplicity, fill whole pixel canvas with cream first
    ctx.fillStyle = "#fbf7ee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();

    // Now prepare for drawing in logical paper space.
    // We'll scale context so that 1 logical unit = device pixel ratio * scale pixels
    const logicalToPixel = (window.devicePixelRatio || 1) * scale;
    ctx.setTransform(logicalToPixel, 0, 0, logicalToPixel, 0, 0);

    // Translate so that the logical canvas has origin at 0 and size equals PAPER_BASE_WIDTH/HEIGHT
    // but our canvas logical size should equal PAPER_BASE_WIDTH x PAPER_BASE_HEIGHT.
    // Draw strokes
    for (const s of strokesRef.current) {
      ctx.beginPath();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.color === "black" ? "#000" : s.color === "red" ? "#d9534f" : "#2563eb";
      ctx.lineWidth = s.width;
      const pts = s.points;
      if (pts.length === 0) continue;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // If there's a current in-progress stroke, draw it on top
    const cur = currentStrokeRef.current;
    if (cur) {
      ctx.beginPath();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalAlpha = cur.alpha;
      ctx.strokeStyle = cur.color === "black" ? "#000" : cur.color === "red" ? "#d9534f" : "#2563eb";
      ctx.lineWidth = cur.width;
      const pts = cur.points;
      if (pts.length > 0) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // draw selection bounding boxes
    if (selectedIds.size > 0) {
      ctx.save();
      ctx.strokeStyle = "#374151"; // gray-700
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1 / logicalToPixel;
      for (const s of strokesRef.current.filter((st) => selectedIds.has(st.id))) {
        const b = s.bbox;
        ctx.strokeRect(b.minX - 4, b.minY - 4, b.maxX - b.minX + 8, b.maxY - b.minY + 8);
      }
      ctx.restore();
    }

    // draw selection rectangle overlay (logical coords)
    if (selectionRect) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#1f2937";
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1 / logicalToPixel;
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
      ctx.restore();
    }
  },
  [scale, selectionRect, selectedIds]
);

// Setup canvas sizing whenever paper size or scale changes
useLayoutEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const DPR = window.devicePixelRatio || 1;
  // canvas physical pixel size:
  const pixelWidth = Math.round(PAPER_BASE_WIDTH * scale * DPR);
  const pixelHeight = Math.round(PAPER_BASE_HEIGHT * scale * DPR);
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  // CSS size (logical pixels) should match paper base dims scaled
  canvas.style.width = `${PAPER_BASE_WIDTH * scale}px`;
  canvas.style.height = `${PAPER_BASE_HEIGHT * scale}px`;
  // draw
  drawAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [scale, drawAll, paperWidth, paperHeight, strokes]);

// Handle window keyboard shortcuts
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    const cmd = e.ctrlKey || e.metaKey;
    if (cmd && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      setShowSearch((s) => {
        const next = !s;
        if (!next) setSearchQuery("");
        return next;
      });
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else if (e.key === "Escape") {
      setShowSearch(false);
      setSelectionRect(null);
      selStartRef.current = null;
    } else if (cmd && (e.key === "z" || e.key === "Z")) {
      if (e.shiftKey) {
        // redo
        doRedo();
      } else {
        doUndo();
      }
    } else if (cmd && (e.key === "y" || e.key === "Y")) {
      doRedo();
    } else if (cmd && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      setScale((s) => Math.min(maxScale, +(s + scaleStep).toFixed(2)));
    } else if (cmd && e.key === "-") {
      e.preventDefault();
      setScale((s) => Math.max(minScale, +(s - scaleStep).toFixed(2)));
    } else if (cmd && e.key === "0") {
      e.preventDefault();
      setScale(1);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedIds.size > 0) {
        setStrokes(strokesRef.current.filter((s) => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
      }
    }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [doRedo, doUndo, maxScale, minScale, scaleStep, selectedIds]);

// Scroll container wheel pinch zoom (Ctrl/Cmd + wheel)
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  function onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // wheel deltaY > 0 means zoom out
      const delta = e.deltaY;
      if (delta < 0) {
        setScale((s) => Math.min(maxScale, +(s + scaleStep).toFixed(2)));
      } else {
        setScale((s) => Math.max(minScale, +(s - scaleStep).toFixed(2)));
      }
    }
  }
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel);
}, [maxScale, minScale, scaleStep]);

// Pointer events for canvas area (drawing / erasing / selecting)
useEffect(() => {
  const canvas = canvasRef.current;
  const overlay = overlayRef.current;
  if (!canvas || !overlay) return;

  function toPaperCoords(e: PointerEvent | PointerEvent & { clientX: number; clientY: number }): Point {
    // get canvas bounding box (use non-null assertion because we early-returned if canvas was missing)
    const r = canvas!.getBoundingClientRect();
    // Compute logical coords (paper-space): client minus left, divided by scale factor
    const clx = e.clientX - r.left;
    const cly = e.clientY - r.top;
    // convert to logical units using CSS width relative to base width
    const logicalX = (clx / (PAPER_BASE_WIDTH * scale)) * PAPER_BASE_WIDTH;
    const logicalY = (cly / (PAPER_BASE_HEIGHT * scale)) * PAPER_BASE_HEIGHT;
    return { x: logicalX, y: logicalY };
  }

  function computeBBox(points: Point[]): BBox {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }

  function pointerDown(e: PointerEvent) {
    // only left button
    if (e.button !== 0) return;
    isPointerDownRef.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    const pt = toPaperCoords(e);

    if (tool === "select") {
      selStartRef.current = pt;
      setSelectionRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
      return;
    }

    if (tool === "eraser") {
      // start an eraser stroke (collect points and then remove intersecting strokes on up)
      currentStrokeRef.current = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        tool: "pen",
        color: "black",
        width: thickness * 6,
        alpha: 1,
        points: [pt],
        bbox: { minX: pt.x, minY: pt.y, maxX: pt.x, maxY: pt.y },
      };
      return;
    }

    // pen or highlighter
    const st: Stroke = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      tool: tool === "highlighter" ? "highlighter" : "pen",
      color,
      width: thickness === 1 ? 2 : thickness === 2 ? 4 : 8,
      alpha: tool === "highlighter" ? 0.25 : 1,
      points: [pt],
      bbox: { minX: pt.x, minY: pt.y, maxX: pt.x, maxY: pt.y },
    };
    currentStrokeRef.current = st;
    drawAll();
  }

  function pointerMove(e: PointerEvent) {
    if (!isPointerDownRef.current) return;
    const pt = toPaperCoords(e);
    if (tool === "select") {
      if (!selStartRef.current) return;
      const s = selStartRef.current;
      const x = Math.min(s.x, pt.x);
      const y = Math.min(s.y, pt.y);
      const w = Math.abs(s.x - pt.x);
      const h = Math.abs(s.y - pt.y);
      setSelectionRect({ x, y, w, h });
      drawAll();
      return;
    }
    const cur = currentStrokeRef.current;
    if (!cur) return;
    cur.points.push(pt);
    // expand bbox
    cur.bbox.minX = Math.min(cur.bbox.minX, pt.x);
    cur.bbox.minY = Math.min(cur.bbox.minY, pt.y);
    cur.bbox.maxX = Math.max(cur.bbox.maxX, pt.x);
    cur.bbox.maxY = Math.max(cur.bbox.maxY, pt.y);
    // live draw
    drawAll();
  }

  function bboxIntersects(a: BBox, b: BBox, pad = 0) {
    return !(a.maxX + pad < b.minX || a.minX - pad > b.maxX || a.maxY + pad < b.minY || a.minY - pad > b.maxY);
  }

  function pointerUp(e: PointerEvent) {
    isPointerDownRef.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
    const pt = toPaperCoords(e);

    if (tool === "select") {
      // finalize selection
      const rect = selectionRect;
      if (rect) {
        const sel = new Set<string>();
        for (const s of strokesRef.current) {
          if (bboxIntersects(s.bbox, { minX: rect.x, minY: rect.y, maxX: rect.x + rect.w, maxY: rect.y + rect.h })) {
            sel.add(s.id);
          }
        }
        setSelectedIds(sel);
      } else {
        setSelectedIds(new Set());
      }
      selStartRef.current = null;
      setSelectionRect(null);
      drawAll();
      return;
    }

    const cur = currentStrokeRef.current;
    if (!cur) return;

    if (tool === "eraser") {
      // remove strokes that intersect eraser bbox with some padding
      const pad = cur.width / 2 + 4;
      const remaining = strokesRef.current.filter((s) => !bboxIntersects(s.bbox, cur.bbox, pad));
      setStrokes(remaining);
      currentStrokeRef.current = null;
      drawAll();
      return;
    }

    // finalize stroke
    cur.points.push(pt);
    cur.bbox = computeBBox(cur.points);
    const next = [...strokesRef.current, cur];
    setStrokes(next);
    currentStrokeRef.current = null;
    drawAll();
  }

  canvas.addEventListener("pointerdown", pointerDown);
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  // prevent default touch gestures on canvas
  canvas.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });

  return () => {
    canvas.removeEventListener("pointerdown", pointerDown);
    window.removeEventListener("pointermove", pointerMove);
    window.removeEventListener("pointerup", pointerUp);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tool, color, thickness, selectionRect]);

// draw when strokes change
useEffect(() => {
  drawAll();
}, [strokes, drawAll]);

// simple search highlight: for now not used to change rendering but kept in state
useEffect(() => {
  if (showSearch) {
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }
}, [showSearch]);

// delete selected via toolbar button
function deleteSelected() {
  if (selectedIds.size === 0) return;
  setStrokes(strokesRef.current.filter((s) => !selectedIds.has(s.id)));
  setSelectedIds(new Set());
}

// export PNG
async function exportPNG() {
  const DPR = window.devicePixelRatio || 1;
  const outCanvas = document.createElement("canvas");
  const w = PAPER_BASE_WIDTH * scale * DPR;
  const h = PAPER_BASE_HEIGHT * scale * DPR;
  outCanvas.width = Math.round(w);
  outCanvas.height = Math.round(h);
  outCanvas.style.width = `${PAPER_BASE_WIDTH * scale}px`;
  outCanvas.style.height = `${PAPER_BASE_HEIGHT * scale}px`;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) return;
  // fill cream background
  ctx.fillStyle = "#fbf7ee";
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  // set logical transform
  ctx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0);

  // draw strokes same as drawAll
  for (const s of strokesRef.current) {
    ctx.beginPath();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = s.alpha;
    ctx.strokeStyle = s.color === "black" ? "#000" : s.color === "red" ? "#d9534f" : "#2563eb";
    ctx.lineWidth = s.width;
    const pts = s.points;
    if (pts.length === 0) continue;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  outCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

// small helpers for UI active classes
const activeClass = "bg-gray-200 rounded";
const activeRing = "ring-2 ring-gray-400";

const handleGenerateQuiz = (quiz: GenerateQuizResponse) => {
  // Create a custom quiz in localStorage using QuizBuilder format
  const customQuizzes = JSON.parse(localStorage.getItem("quizzes:custom") || "[]");
  
  // Create a slug from the title
  const slug = quiz.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  const newQuiz = {
    slug: slug || `quiz-${Date.now()}`,
    title: quiz.title,
    description: quiz.subtitle,
    difficulty: "ปานกลาง" as const,
    questions: quiz.questions.map((q, idx) => ({
      id: `q-${Date.now()}-${idx}`,
      text: q.text,
      answers: q.answers.map((a, aidx) => ({
        id: `a-${Date.now()}-${aidx}`,
        text: a.text,
        correct: a.correct,
      })),
      detail: q.detail,
      tag: q.tag,
    })),
    createdAt: Date.now(),
    isCustom: true as const,
  };
  
  customQuizzes.push(newQuiz);
  localStorage.setItem("quizzes:custom", JSON.stringify(customQuizzes));
  
  // Navigate to quiz editor to let user refine it
  navigate(`/quiz-builder/${newQuiz.slug}`);
};

const handleGenerateFlashcards = (response: GenerateFlashcardResponse) => {
  // Create a custom flashcard deck in localStorage using Flashcards format
  const customDecks = JSON.parse(localStorage.getItem("flashcards:decks") || "[]");
  
  // Create a slug from the title
  const slug = response.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  const newDeck = {
    id: slug || `flashcard-${Date.now()}`,
    title: response.title,
    cards: response.flashcards.map((fc, idx) => ({
      id: `fc-${Date.now()}-${idx}`,
      front: fc.front,
      back: fc.back,
    })),
    createdAt: Date.now(),
  };
  
  customDecks.push(newDeck);
  localStorage.setItem("flashcards:decks", JSON.stringify(customDecks));
  
  // Navigate to flashcard detail page to let user refine it
  navigate(`/flashcard/${newDeck.id}`);
};

return (
  <div className="flex flex-col h-screen bg-gray-100">
    <WorkspaceToolbar
      title={capitalizeWords(noteId)}
      showSearch={showSearch}
      setShowSearch={setShowSearch}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchInputRef={searchInputRef as any}
      onZoomIn={() => setScale((s) => Math.min(maxScale, +(s + scaleStep).toFixed(2)))}
      onZoomOut={() => setScale((s) => Math.max(minScale, +(s - scaleStep).toFixed(2)))}
      scale={scale}
      onDownload={exportPNG}
      onBack={() => navigate(-1)}
      onClose={() => navigate(-1)}
    />

    {/* Content */}
    <div ref={containerRef} className="relative flex-1 overflow-auto bg-transparent flex flex-col items-center py-6 px-4 scroll-smooth">
      {/* subtle loading spinner */}
      {loading && (
        <div className="absolute top-4 pointer-events-none">
          <div className="text-gray-400 flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-sm text-gray-500">Loading…</span>
          </div>
        </div>
      )}

      {/* Paper surface */}
      <div
        className="bg-[#fbf7ee] rounded shadow-sm border border-gray-200"
        style={{
          width: `${PAPER_BASE_WIDTH * scale}px`,
          height: `${PAPER_BASE_HEIGHT * scale}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Note canvas"
          style={{
            cursor: tool === "select" ? "crosshair" : tool === "eraser" ? "crosshair" : "crosshair",
            touchAction: "none",
          }}
        />
        {/* overlay for selection rectangle */}
        <div
          ref={overlayRef}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        >
          {/* selection rectangle as DOM (optional) */}
          {selectionRect && (
            <div
              style={{
                position: "absolute",
                left: `${(selectionRect.x / PAPER_BASE_WIDTH) * 100}%`,
                top: `${(selectionRect.y / PAPER_BASE_HEIGHT) * 100}%`,
                width: `${(selectionRect.w / PAPER_BASE_WIDTH) * 100}%`,
                height: `${(selectionRect.h / PAPER_BASE_HEIGHT) * 100}%`,
                border: "1px dashed rgba(55,65,81,0.9)",
                background: "rgba(255,255,255,0.0)",
              }}
            />
          )}
        </div>
      </div>

      {/* status text */}
      <div className="mt-3 text-sm text-gray-500">
        {lastSavedTime ? `Saved ${new Date(lastSavedTime).toLocaleString()}` : "Not saved yet"}
        {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
      </div>
    </div>

    {/* Bottom toolbar */}
    <div className="bg-[#FFF7DA] border-t border-gray-300 p-3 flex items-center justify-center gap-4 sticky bottom-0 shadow-sm">
      {/* Tools: Pen, Highlighter, Eraser, Select */}
      <div className="flex items-center gap-2">
        <button
          title="Pen"
          className={`p-2 hover:bg-gray-200 rounded transition ${tool === "pen" ? activeClass : ""}`}
          onClick={() => setTool("pen")}
        >
          <PenIcon size={18} />
        </button>
        <button
          title="Highlighter"
          className={`p-2 hover:bg-gray-200 rounded transition ${tool === "highlighter" ? activeClass : ""}`}
          onClick={() => setTool("highlighter")}
        >
          <MousePointer size={18} />
        </button>
        <button
          title="Eraser"
          className={`p-2 hover:bg-gray-200 rounded transition ${tool === "eraser" ? activeClass : ""}`}
          onClick={() => setTool("eraser")}
        >
          <Eraser size={18} />
        </button>
        <button
          title="Select"
          className={`p-2 hover:bg-gray-200 rounded transition ${tool === "select" ? activeClass : ""}`}
          onClick={() => setTool("select")}
        >
          <Square size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Colors */}
      <div className="flex items-center gap-2">
        {(["black", "red", "blue"] as const).map((c) => (
          <button
            key={c}
            title={`Color ${c}`}
            className={`w-6 h-6 rounded-full ${color === c ? activeRing : ""}`}
            onClick={() => setColor(c)}
            style={{
              background:
                c === "black" ? "#000" : c === "red" ? "#d9534f" : c === "blue" ? "#2563eb" : "#000",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Thickness */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((t) => {
          const w = t === 1 ? 2 : t === 2 ? 4 : 8;
          return (
            <button
              key={t}
              title={t === 1 ? "Thin" : t === 2 ? "Medium" : "Thick"}
              className={`p-2 hover:bg-gray-200 rounded transition flex items-center justify-center ${
                thickness === t ? activeClass : ""
              }`}
              onClick={() => setThickness(t)}
            >
              <div style={{ width: w, height: w, background: color === "black" ? "#000" : color === "red" ? "#d9534f" : "#2563eb", borderRadius: 2 }} />
            </button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Undo/Redo/Delete */}
      <div className="flex items-center gap-2">
        <button
          title="Undo (Ctrl/Cmd+Z)"
          className="p-2 hover:bg-gray-200 rounded transition"
          onClick={() => doUndo()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 17H5V13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 8a8 8 0 10-11.3 7.3L5 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          title="Redo (Ctrl/Cmd+Shift+Z)"
          className="p-2 hover:bg-gray-200 rounded transition"
          onClick={() => doRedo()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 17h4v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8a8 8 0 0111.3-7.3L19 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          title="Delete selected"
          className="p-2 hover:bg-gray-200 rounded transition"
          onClick={() => deleteSelected()}
          disabled={selectedIds.size === 0}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Generate Quiz Button */}
      <button
        title="สร้างแบบทดสอบจากเนื้อหา"
        className="p-2 hover:bg-gray-200 rounded transition text-teal-600"
        onClick={() => setShowGenerateModal(true)}
      >
        <ClipboardList size={18} />
      </button>
      <button
        title="สร้างแฟลชการ์ดจากเนื้อหา"
        className="p-2 hover:bg-gray-200 rounded transition text-purple-600"
        onClick={() => setShowGenerateFlashcardModal(true)}
      >
        <WalletCards size={18} />
      </button>
    </div>

    {/* Generate Quiz Modal */}
    <GenerateQuizModal
      isOpen={showGenerateModal}
      onClose={() => setShowGenerateModal(false)}
      onGenerate={handleGenerateQuiz}
      canvasRef={canvasRef}
    />

    {/* Generate Flashcard Modal */}
    <GenerateFlashcardModal
      isOpen={showGenerateFlashcardModal}
      onClose={() => setShowGenerateFlashcardModal(false)}
      onGenerate={handleGenerateFlashcards}
      canvasRef={canvasRef}
    />
  </div>
);
}