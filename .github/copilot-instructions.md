**Repository Summary**
- **Purpose:**: A small React + TypeScript + Vite app for viewing and annotating PDFs and hosting simple quizzes.
- **Key folders:**: `src/pages` (route views), `src/components` (UI + PDF rendering/annotation), `src/lib` (helpers like `firebase` and `ProtectedRoute`).

**How to run (developer)**
- **Dev server:**: `npm run dev` (starts Vite with HMR). Use PowerShell on Windows: `npm run dev`.
- **Build:**: `npm run build` (runs `tsc -b` then `vite build`).
- **Preview production build:**: `npm run preview`.
- **Lint:**: `npm run lint` (ESLint).

**Project architecture (big picture)**
- **Routing:**: `src/main.tsx` mounts `App` with `BrowserRouter`. Routes are declared in `src/App.tsx` and mostly wrapped with `ProtectedRoute` (Firebase auth gating).
- **Pages:**: `src/pages/*` are route-level views (e.g. `PdfViewer.tsx`, `Home.tsx`, quiz pages).
- **PDF stack:**: `src/components/PdfCanvas.tsx` loads PDFs using `pdfjs-dist`, implements a render queue, LRU bitmap cache, and offscreen rendering for performant zoom/pan. `PdfAnnotationLayer.tsx`, `AnnotationToolbar.tsx`, and `annotationStore.tsx` provide annotation UI and state.
- **Auth & backend:**: Minimal Firebase integration in `src/lib/firebase.ts`. Environment variables are expected as `VITE_*` keys (documented inline in `firebase.ts`).

**Important patterns & conventions**
- **Path alias:**: Imports commonly use `@/...` which maps to `src/*` (see `tsconfig.json` `paths` entry). Prefer `@/components/...` in new files.
- **Default exports for components:**: Most components are `export default` (e.g. `App`, page components). Follow that when adding pages/components.
- **Local persistence for annotations:**: `annotationStore.tsx` persists per-PDF into `localStorage` keys like `annot-${pdfKey}`. If changing serialization, keep compatibility with existing keys.
- **PDF rendering model:**: PdfCanvas uses three layers: fast cached bitmap draw, queued high-quality render (idle + concurrency limit), and final draw via `createImageBitmap`. Respect existing LRU and `MAX_CONCURRENT_RENDERS` behaviour when modifying rendering.
- **Annotation APIs:**: Use `AnnotationProvider` wrapper (in `PdfCanvas`) and hooks: `useAnnotationsForPage`, `useAnnotationActions`, `useAnnotationUIState` to read/update strokes.

**Integration points & env**
- **Firebase:**: Configure Vite env (.env or .env.local) with `VITE_FIREBASE_*` keys listed in `src/lib/firebase.ts`.
- **PDF files:**: PDFs are served from `public/assets/`. `PdfViewer` expects a route param `:pdfName` and fetches `/assets/${pdfName}.pdf`.
- **Third-party libs:**: `pdfjs-dist`, `firebase`, `lucide-react` (icons), Radix UI primitives, TailwindCSS. Be mindful of their versions in `package.json`.

**Developer notes for contributions**
- **Avoid rendering regressions:**: When editing `PdfCanvas`, preserve the render queue, idle scheduling, and bitmap LRU behavior — it's intentionally tuned for responsive zoom and limited memory.
- **Follow keyboard UX:**: `PdfViewer` implements shortcuts (Ctrl/Cmd+F, Arrow keys, PageUp/PageDown, Ctrl/Cmd+Plus/Minus/0). If adding global handlers, avoid conflicting keys.
- **Files & naming:**: Keep pages in `src/pages`, small reusable UI controls in `src/components/ui`, and shared helpers in `src/lib`.
- **TypeScript paths:**: Use `@/...` to match existing imports. Keep `tsconfig` path mapping in mind when adding tests or node scripts.

**Examples (copy-paste snippets)**
- Importing a component with alias: `import PdfCanvas from "@/components/PdfCanvas";`
- Firebase env example (in `.env`):
  - `VITE_FIREBASE_API_KEY=your_api_key`
- Annotation hook usage example:
  - `const annotations = useAnnotationsForPage(pageNum);`
  - `const { addStroke, undo } = useAnnotationActions();`

**What the AI should prioritize when editing/creating code**
- Preserve existing UX and performance decisions in `PdfCanvas` and `annotationStore`.
- Use existing export/import conventions (`default` component exports, `@/` alias).
- Update `README.md` or add migration notes when changing persistence formats (localStorage) or env keys.

If anything here is unclear or you want this tailored (more examples, test/build instructions, or contributor checklist), tell me which sections to expand or clarify.
