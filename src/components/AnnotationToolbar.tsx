import { useMemo } from "react";
import { useAnnotationActions, useAnnotationUIState, type ToolKind } from "./annotationStore";

type Props = {
  pageNum: number;
  className?: string;
};

const penColors = ["#111827", "#2563eb", "#16a34a", "#7c3aed", "#ef4444"];
const highlighterColors = ["#fde047", "#fca5a5", "#bfdbfe", "#a7f3d0"];

export default function AnnotationToolbar({ className = "", pageNum }: Props) {
  const ui = useAnnotationUIState();
  const actions = useAnnotationActions();

  const activeStrokeWidth = useMemo(() => {
    return ui.tool === "highlighter" ? ui.highlighterWidth : ui.width;
  }, [ui.tool, ui.highlighterWidth, ui.width]);

  const isActive = (tool: ToolKind) => (ui.tool === tool ? "bg-gray-900 text-white" : "bg-white text-gray-800");

  return (
    <div
      className={`flex flex-wrap gap-2 items-center shadow-md rounded-full px-3 py-2 bg-white/90 border border-gray-200 ${className}`}
    >
      <button
        className={`px-3 py-1 rounded-full text-sm font-medium ${isActive("pen")}`}
        onClick={() => actions.setTool("pen")}
      >
        Pen
      </button>
      <button
        className={`px-3 py-1 rounded-full text-sm font-medium ${isActive("highlighter")}`}
        onClick={() => actions.setTool("highlighter")}
      >
        Highlighter
      </button>
      <button
        className={`px-3 py-1 rounded-full text-sm font-medium ${isActive("lasso")}`}
        onClick={() => actions.setTool("lasso")}
      >
        Lasso
      </button>
      <button
        className={`px-3 py-1 rounded-full text-sm font-medium ${isActive("eraser")}`}
        onClick={() => actions.setTool("eraser")}
      >
        Eraser
      </button>

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <div className="flex items-center gap-1">
        {ui.tool === "highlighter"
          ? highlighterColors.map((c) => (
              <Swatch key={c} color={c} active={ui.highlighterColor === c} onClick={() => actions.setHighlighterColor(c)} />
            ))
          : penColors.map((c) => <Swatch key={c} color={c} active={ui.color === c} onClick={() => actions.setColor(c)} />)}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-700 ml-2">
        <span>Size</span>
        <input
          type="range"
          min={ui.tool === "highlighter" ? 6 : 1}
          max={ui.tool === "highlighter" ? 24 : 12}
          value={activeStrokeWidth}
          onChange={(e) =>
            ui.tool === "highlighter" ? actions.setHighlighterWidth(Number(e.target.value)) : actions.setWidth(Number(e.target.value))
          }
        />
      </div>

      {ui.tool === "highlighter" && (
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <span>Opacity</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={ui.highlighterOpacity}
            onChange={(e) => actions.setHighlighterOpacity(Number(e.target.value))}
          />
        </div>
      )}

      <div className="h-6 w-px bg-gray-200 mx-1" />
      <button className="px-3 py-1 rounded-full text-sm bg-white border" onClick={actions.undo}>
        Undo
      </button>
      <button className="px-3 py-1 rounded-full text-sm bg-white border" onClick={actions.redo}>
        Redo
      </button>
      <button className="px-3 py-1 rounded-full text-sm bg-white border" onClick={() => actions.removeStrokes(pageNum, ui.selectedIds.size ? Array.from(ui.selectedIds) : [])} title="Delete selected">Delete</button>
    </div>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="h-6 w-6 rounded-full border border-gray-200"
      style={{
        backgroundColor: color,
        boxShadow: active ? "0 0 0 2px #111827 inset" : "none",
      }}
      onClick={onClick}
      aria-label={`color ${color}`}
    />
  );
}

