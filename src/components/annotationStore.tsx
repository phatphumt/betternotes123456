import { createContext, useCallback, useContext, useMemo, useReducer } from "react";

export type ToolKind = "pen" | "highlighter" | "lasso" | "eraser";

export type StrokePoint = { x: number; y: number; p: number; t: number };
export type Stroke = {
  id: string;
  page: number;
  type: "pen" | "highlighter";
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
  createdAt: number;
  updatedAt: number;
};

type State = {
  tool: ToolKind;
  color: string;
  width: number;
  highlighterColor: string;
  highlighterWidth: number;
  highlighterOpacity: number;
  annotations: Record<string, Stroke[]>; // key = `${pdfPath}|${page}`
  selectedIds: Set<string>;
  undoStack: string[];
  redoStack: string[];
};

type Action =
  | { type: "SET_TOOL"; tool: ToolKind }
  | { type: "SET_COLOR"; color: string }
  | { type: "SET_WIDTH"; width: number }
  | { type: "SET_HIGHLIGHTER_COLOR"; color: string }
  | { type: "SET_HIGHLIGHTER_WIDTH"; width: number }
  | { type: "SET_HIGHLIGHTER_OPACITY"; opacity: number }
  | { type: "LOAD"; pdfKey: string; data: Stroke[] }
  | { type: "ADD_STROKE"; pdfKey: string; stroke: Stroke }
  | { type: "REMOVE_STROKES"; pdfKey: string; ids: string[] }
  | { type: "SET_SELECTED"; ids: string[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "UPDATE_STROKES"; pdfKey: string; ids: string[]; updater: (s: Stroke) => Stroke };

const defaultState: State = {
  tool: "pen",
  color: "#1f2937",
  width: 3,
  highlighterColor: "#facc15",
  highlighterWidth: 12,
  highlighterOpacity: 0.35,
  annotations: {},
  selectedIds: new Set(),
  undoStack: [],
  redoStack: [],
};

function serializeSnapshot(state: State) {
  // Only persist annotations and selection
  const plain = {
    annotations: state.annotations,
    selectedIds: Array.from(state.selectedIds),
  };
  return JSON.stringify(plain);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, tool: action.tool };
    case "SET_COLOR":
      return { ...state, color: action.color };
    case "SET_WIDTH":
      return { ...state, width: action.width };
    case "SET_HIGHLIGHTER_COLOR":
      return { ...state, highlighterColor: action.color };
    case "SET_HIGHLIGHTER_WIDTH":
      return { ...state, highlighterWidth: action.width };
    case "SET_HIGHLIGHTER_OPACITY":
      return { ...state, highlighterOpacity: action.opacity };
    case "LOAD": {
      const annotations = { ...state.annotations, [action.pdfKey]: action.data };
      return { ...state, annotations };
    }
    case "ADD_STROKE": {
      const next = JSON.parse(JSON.stringify(state)) as State;
      const list = next.annotations[action.pdfKey] || [];
      next.annotations[action.pdfKey] = [...list, action.stroke];
      next.selectedIds = new Set(state.selectedIds);
      next.undoStack.push(serializeSnapshot(state));
      next.redoStack = [];
      return next;
    }
    case "REMOVE_STROKES": {
      const next = JSON.parse(JSON.stringify(state)) as State;
      const list = next.annotations[action.pdfKey] || [];
      next.annotations[action.pdfKey] = list.filter((s) => !action.ids.includes(s.id));
      next.selectedIds = new Set();
      next.undoStack.push(serializeSnapshot(state));
      next.redoStack = [];
      return next;
    }
    case "SET_SELECTED":
      return { ...state, selectedIds: new Set(action.ids) };
    case "UPDATE_STROKES": {
      const next = JSON.parse(JSON.stringify(state)) as State;
      const list = next.annotations[action.pdfKey] || [];
      next.annotations[action.pdfKey] = list.map((s) => (action.ids.includes(s.id) ? action.updater(s) : s));
      next.selectedIds = new Set(state.selectedIds);
      next.undoStack.push(serializeSnapshot(state));
      next.redoStack = [];
      return next;
    }
    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const prevJson = state.undoStack[state.undoStack.length - 1];
      const prev = JSON.parse(prevJson) as { annotations: State["annotations"]; selectedIds: string[] };
      const undoStack = state.undoStack.slice(0, -1);
      const redoStack = [...state.redoStack, serializeSnapshot(state)];
      return { ...state, annotations: prev.annotations, selectedIds: new Set(prev.selectedIds), undoStack, redoStack };
    }
    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const nextJson = state.redoStack[state.redoStack.length - 1];
      const nextSnap = JSON.parse(nextJson) as { annotations: State["annotations"]; selectedIds: string[] };
      const redoStack = state.redoStack.slice(0, -1);
      const undoStack = [...state.undoStack, serializeSnapshot(state)];
      return { ...state, annotations: nextSnap.annotations, selectedIds: new Set(nextSnap.selectedIds), undoStack, redoStack };
    }
    default:
      return state;
  }
}

type Ctx = {
  state: State;
  dispatch: React.Dispatch<Action>;
  pdfKey: string;
};

const AnnotationContext = createContext<Ctx | null>(null);

type ProviderProps = { pdfPath: string; children: React.ReactNode };

export function AnnotationProvider({ pdfPath, children }: ProviderProps) {
  const pdfKey = useMemo(() => pdfPath, [pdfPath]);
  const [state, dispatch] = useReducer(reducer, defaultState, (init) => {
    if (typeof window === "undefined") return init;
    const raw = window.localStorage.getItem(`annot-${pdfKey}`);
    if (!raw) return init;
    try {
      const parsed = JSON.parse(raw) as Partial<State> & { annotations?: State["annotations"]; selectedIds?: string[] };
      return {
        ...init,
        annotations: parsed.annotations || {},
        selectedIds: new Set(parsed.selectedIds || []),
      };
    } catch {
      return init;
    }
  });

  // Persist annotations per pdfKey
  const persist = useCallback(
    (next: State) => {
      const payload = {
        annotations: next.annotations,
        selectedIds: Array.from(next.selectedIds),
      };
      window.localStorage.setItem(`annot-${pdfKey}`, JSON.stringify(payload));
    },
    [pdfKey]
  );

  // Persist on every change of annotations/selection
  useMemo(() => {
    if (typeof window === "undefined") return;
    persist(state);
  }, [state.annotations, state.selectedIds, persist]);

  const value = useMemo(() => ({ state, dispatch, pdfKey }), [state, dispatch, pdfKey]);
  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>;
}

export function useAnnotationContext() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error("AnnotationContext missing");
  return ctx;
}

export function useAnnotationsForPage(page: number) {
  const { state, pdfKey } = useAnnotationContext();
  return state.annotations[`${pdfKey}|${page}`] || [];
}

export function useAnnotationActions() {
  const { dispatch, pdfKey } = useAnnotationContext();

  const addStroke = useCallback(
    (page: number, stroke: Omit<Stroke, "id" | "page" | "createdAt" | "updatedAt">) => {
      const now = Date.now();
      dispatch({
        type: "ADD_STROKE",
        pdfKey: `${pdfKey}|${page}`,
        stroke: { ...stroke, id: crypto.randomUUID(), page, createdAt: now, updatedAt: now },
      });
    },
    [dispatch, pdfKey]
  );

  const removeStrokes = useCallback(
    (page: number, ids: string[]) => {
      dispatch({ type: "REMOVE_STROKES", pdfKey: `${pdfKey}|${page}`, ids });
    },
    [dispatch, pdfKey]
  );

  const updateStrokes = useCallback(
    (page: number, ids: string[], updater: (s: Stroke) => Stroke) => {
      dispatch({ type: "UPDATE_STROKES", pdfKey: `${pdfKey}|${page}`, ids, updater });
    },
    [dispatch, pdfKey]
  );

  const setSelected = useCallback(
    (ids: string[]) => {
      dispatch({ type: "SET_SELECTED", ids });
    },
    [dispatch]
  );

  const undo = useCallback(() => dispatch({ type: "UNDO" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "REDO" }), [dispatch]);

  const setTool = useCallback((tool: ToolKind) => dispatch({ type: "SET_TOOL", tool }), [dispatch]);
  const setColor = useCallback((color: string) => dispatch({ type: "SET_COLOR", color }), [dispatch]);
  const setWidth = useCallback((width: number) => dispatch({ type: "SET_WIDTH", width }), [dispatch]);
  const setHighlighterColor = useCallback((color: string) => dispatch({ type: "SET_HIGHLIGHTER_COLOR", color }), [dispatch]);
  const setHighlighterWidth = useCallback((width: number) => dispatch({ type: "SET_HIGHLIGHTER_WIDTH", width }), [dispatch]);
  const setHighlighterOpacity = useCallback(
    (opacity: number) => dispatch({ type: "SET_HIGHLIGHTER_OPACITY", opacity }),
    [dispatch]
  );

  return {
    addStroke,
    removeStrokes,
    setSelected,
    updateStrokes,
    undo,
    redo,
    setTool,
    setColor,
    setWidth,
    setHighlighterColor,
    setHighlighterWidth,
    setHighlighterOpacity,
  };
}

export function useAnnotationUIState() {
  const { state } = useAnnotationContext();
  return state;
}

