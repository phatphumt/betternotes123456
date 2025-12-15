import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import AnnotationToolbar from "./AnnotationToolbar";
import PdfAnnotationLayer from "./PdfAnnotationLayer";
import { AnnotationProvider } from "./annotationStore";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface PdfCanvasProps {
  pdfPath: string;
  scale: number; // user zoom multiplier (1 = fit width)
  pageNum: number;
  containerWidth: number;
  onPageRender?: (pageNum: number, totalPages: number) => void;
}

/** ---------------------------
 *  Global PDF + render caches
 *  --------------------------*/

// Cache loaded documents (so multiple pages don’t re-download / re-parse)
const pdfDocCache = new Map<string, Promise<any>>();

// LRU cache for rendered bitmaps (fast to draw, not DOM nodes)
type BitmapCacheEntry = {
  bitmap: ImageBitmap;
  cssWidth: number;   // viewport width in CSS px
  cssHeight: number;  // viewport height in CSS px
  qualityScale: number; // the render scale used (fitScale*scale after clamps)
};

const bitmapCache = new Map<string, BitmapCacheEntry>(); // key = `${pdfPath}|${pageNum}|${bucket}`
const MAX_BITMAP_CACHE = 12;

function lruGet(key: string) {
  const v = bitmapCache.get(key);
  if (!v) return null;
  // refresh LRU
  bitmapCache.delete(key);
  bitmapCache.set(key, v);
  return v;
}

function lruSet(key: string, value: BitmapCacheEntry) {
  bitmapCache.set(key, value);
  while (bitmapCache.size > MAX_BITMAP_CACHE) {
    const oldestKey = bitmapCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    const old = bitmapCache.get(oldestKey);
    if (old) old.bitmap.close?.();
    bitmapCache.delete(oldestKey);
  }
}

/** ---------------------------
 *  Global render queue (limit concurrency)
 *  --------------------------*/
const MAX_CONCURRENT_RENDERS = 2;
let activeRenders = 0;
const renderQueue: Array<() => Promise<void>> = [];

function scheduleRender(job: () => Promise<void>) {
  renderQueue.push(job);
  pumpQueue();
}

function pumpQueue() {
  while (activeRenders < MAX_CONCURRENT_RENDERS && renderQueue.length > 0) {
    const job = renderQueue.shift()!;
    activeRenders++;
    job()
      .catch(() => {})
      .finally(() => {
        activeRenders--;
        pumpQueue();
      });
  }
}

/** ---------------------------
 *  Helpers
 *  --------------------------*/

// Slightly higher caps to allow >250% zoom with less pixelation
const MAX_DPR = 3;            // clamp DPR (keeps GPU upload reasonable)
const MAX_MEGAPIXELS = 12;    // clamp canvas pixel count

function bucketScale(s: number) {
  // bucket zoom so we don’t render 1.01, 1.02, 1.03… all separately
  return Math.round(s * 20) / 20; // steps of 0.05
}

function clampViewportScaleToMegapixels(cssW: number, cssH: number, dpr: number) {
  const pixels = cssW * cssH * dpr * dpr;
  const maxPixels = MAX_MEGAPIXELS * 1_000_000;
  if (pixels <= maxPixels) return 1;
  return Math.sqrt(maxPixels / pixels);
}

async function getPdfDoc(pdfPath: string) {
  if (!pdfDocCache.has(pdfPath)) {
    pdfDocCache.set(pdfPath, pdfjsLib.getDocument(pdfPath).promise);
  }
  return pdfDocCache.get(pdfPath)!;
}

// best-effort “idle” (so we don’t block scroll/paint)
function runWhenIdle(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(fn, { timeout: 500 });
  }
  return window.setTimeout(fn, 80);
}

function cancelIdle(id: any) {
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(id);
    return;
  }
  clearTimeout(id);
}

/** ---------------------------
 *  Component
 *  --------------------------*/

export default function PdfCanvas({
  pdfPath,
  scale,
  pageNum,
  containerWidth,
  onPageRender,
}: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const lastRequestIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
   const [pageLayout, setPageLayout] = useState({
    baseWidth: 0,
    baseHeight: 0,
    fitWidth: 0,
    fitHeight: 0,
  });

  const maxWidth = useMemo(() => containerWidth, [containerWidth]);

  useEffect(() => {
    let alive = true;
    const requestId = ++lastRequestIdRef.current;

    const doWork = async () => {
      try {
        setError(null);

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Cancel in-flight render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel?.();
          renderTaskRef.current = null;
        }

        const pdf = await getPdfDoc(pdfPath);
        if (!alive || requestId !== lastRequestIdRef.current) return;

        if (pageNum < 1 || pageNum > pdf.numPages) {
          setError("Invalid page number");
          return;
        }

        const page = await pdf.getPage(pageNum);
        if (!alive || requestId !== lastRequestIdRef.current) return;

        // Determine base fit scale (fit to container width)
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = maxWidth / baseViewport.width;
        const fitWidth = baseViewport.width * fitScale;
        const fitHeight = baseViewport.height * fitScale;
        setPageLayout({
          baseWidth: baseViewport.width,
          baseHeight: baseViewport.height,
          fitWidth,
          fitHeight,
        });

        // target quality scale (before clamps)
        const targetQualityScale = fitScale * scale;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

        // bucket to avoid infinite re-renders at tiny zoom deltas
        const bucket = bucketScale(targetQualityScale);
        const cacheKey = `${pdfPath}|${pageNum}|${bucket}`;

        // 1) FAST PATH: draw best cached bitmap immediately (no extra rendering)
        // Try exact bucket first, then closest lower bucket
        const exact = lruGet(cacheKey);
        if (exact) {
          drawBitmapToCanvas(
            canvas,
            exact.bitmap,
            exact.cssWidth,
            exact.cssHeight,
            dpr,
            fitWidth,
            fitHeight,
            scale
          );
          setIsLoading(false);
          onPageRender?.(pageNum, pdf.numPages);
        } else {
          // Find best available cached entry for this page (same pdf+page) with closest scale
          const prefix = `${pdfPath}|${pageNum}|`;
          let bestKey: string | null = null;
          let bestEntry: BitmapCacheEntry | null = null;

          for (const [k, v] of bitmapCache.entries()) {
            if (!k.startsWith(prefix)) continue;
            if (!bestEntry || v.qualityScale > bestEntry.qualityScale) {
              bestEntry = v;
              bestKey = k;
            }
          }

          if (bestEntry) {
            // draw a preview from whatever we have
            lruGet(bestKey!); // touch LRU
            drawBitmapToCanvas(
              canvas,
              bestEntry.bitmap,
              bestEntry.cssWidth,
              bestEntry.cssHeight,
              dpr,
              fitWidth,
              fitHeight,
              scale
            );
          }
        }

        // 2) SCHEDULE HIGH-QUALITY RENDER (idle + queued + cancellable)
        setIsLoading(true);

        // Small debounce so pinch-zoom / scroll doesn’t spam renders
        const idleId = runWhenIdle(() => {
          scheduleRender(async () => {
            if (!alive || requestId !== lastRequestIdRef.current) return;

            // If we already have exact cached, skip
            if (lruGet(cacheKey)) {
              if (alive && requestId === lastRequestIdRef.current) setIsLoading(false);
              return;
            }

            // Compute viewport at bucket scale
            const viewport = page.getViewport({ scale: bucket });

            // Clamp scale if megapixels too high
            const clampFactor = clampViewportScaleToMegapixels(viewport.width, viewport.height, dpr);
            const finalScale = bucket * clampFactor;
            const finalViewport = page.getViewport({ scale: finalScale });

            // Render offscreen
            const offscreen = document.createElement("canvas");
            offscreen.width = Math.floor(finalViewport.width * dpr);
            offscreen.height = Math.floor(finalViewport.height * dpr);

            const ctx = offscreen.getContext("2d", { alpha: false });
            if (!ctx) throw new Error("Failed to get canvas context");

            // IMPORTANT: use setTransform, not scale(), to avoid compounding transforms
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Cancel previous render task if any
            if (renderTaskRef.current) {
              renderTaskRef.current.cancel?.();
              renderTaskRef.current = null;
            }

            const task = page.render({
              canvasContext: ctx,
              viewport: finalViewport,
            });

            renderTaskRef.current = task;

            try {
              await task.promise;
            } catch (e: any) {
              // ignore cancellations
              if (e?.name === "RenderingCancelledException") return;
              throw e;
            } finally {
              renderTaskRef.current = null;
            }

            if (!alive || requestId !== lastRequestIdRef.current) return;

            const bitmap = await createImageBitmap(offscreen);
            const entry: BitmapCacheEntry = {
              bitmap,
              cssWidth: finalViewport.width,
              cssHeight: finalViewport.height,
              qualityScale: finalScale,
            };
            lruSet(cacheKey, entry);

            // Draw final
            const liveCanvas = canvasRef.current;
            if (liveCanvas && alive && requestId === lastRequestIdRef.current) {
              drawBitmapToCanvas(
                liveCanvas,
                bitmap,
                entry.cssWidth,
                entry.cssHeight,
                dpr,
                fitWidth,
                fitHeight,
                scale
              );
              onPageRender?.(pageNum, pdf.numPages);
              setIsLoading(false);
            }
          });
        });

        // cleanup debounce
        return () => cancelIdle(idleId);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          setError(err?.message ?? "Failed to render PDF");
        }
        setIsLoading(false);
      }
    };

    let cancelDebounce: any;
    doWork().then((cleanup) => (cancelDebounce = cleanup));

    return () => {
      alive = false;
      if (cancelDebounce) cancelDebounce();
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel?.();
        renderTaskRef.current = null;
      }
    };
  }, [pdfPath, pageNum, scale, maxWidth, onPageRender]);

  return (
    <AnnotationProvider pdfPath={pdfPath}>
      <div className="flex flex-col items-center justify-center w-full bg-transparent gap-3">
        {error && (
          <div className="text-red-500 text-sm p-3 bg-red-50 rounded max-w-sm">
            {error}
          </div>
        )}

        {/* Keep toolbar above the canvas to avoid covering content */}
        <div className="w-full flex justify-center">
          <AnnotationToolbar pageNum={pageNum} className="z-20 pointer-events-auto" />
        </div>

        <div className="relative flex items-center justify-center bg-transparent">
          <canvas ref={canvasRef} style={{ display: "block" }} />
          <PdfAnnotationLayer pageNum={pageNum} layout={pageLayout} scale={scale} />
          {isLoading && (
            <div className="absolute top-2 right-2 text-xs opacity-70">
              Rendering…
            </div>
          )}
        </div>
      </div>
    </AnnotationProvider>
  );
}

/** Draw bitmap to visible canvas without reallocating DOM nodes */
function drawBitmapToCanvas(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  bitmapCssW: number,
  bitmapCssH: number,
  dpr: number,
  fitWidth: number,
  fitHeight: number,
  userScale: number
) {
  const effectiveFitWidth = fitWidth || bitmapCssW;
  const effectiveFitHeight = fitHeight || bitmapCssH;

  // Display size should follow current zoom based on fit-to-width dimensions
  const displayW = effectiveFitWidth * userScale;
  const displayH = effectiveFitHeight * userScale;

  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;

  const pxW = Math.floor(displayW * dpr);
  const pxH = Math.floor(displayH * dpr);

  // Resize only if needed (resizing wipes canvas)
  if (canvas.width !== pxW) canvas.width = pxW;
  if (canvas.height !== pxH) canvas.height = pxH;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayW, displayH);
  ctx.drawImage(bitmap, 0, 0, displayW, displayH);
}
