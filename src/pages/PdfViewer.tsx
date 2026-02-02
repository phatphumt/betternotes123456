import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WorkspaceToolbar from "@/components/WorkspaceToolbar";
import PdfCanvas from "@/components/PdfCanvas";

export default function PdfViewer() {
  const { pdfName } = useParams();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [isLoading, setIsLoading] = useState(true);

  const pdfPath = `/assets/${pdfName}.pdf`;

  // Track available width of the scroll container so 100% = fit-to-width
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width || 900;
      // subtract horizontal padding (px-4 -> 32px)
      setContainerWidth(Math.max(320, width - 32));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.1, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.1, 0.25));
  }, []);

  const handleFit100 = useCallback(() => {
    setScale(1);
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = pdfPath;
    link.download = `${pdfName}.pdf`;
    link.click();
  }, [pdfPath, pdfName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac/.test(navigator.platform);
      const isCtrlCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlCmd && e.key === "f") {
        e.preventDefault();
        setShowSearch(!showSearch);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (e.key === "Escape") {
        setShowSearch(false);
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === "PageDown") {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === "PageUp") {
        e.preventDefault();
        goToPrevPage();
      } else if (isCtrlCmd && e.key === "+") {
        e.preventDefault();
        handleZoomIn();
      } else if (isCtrlCmd && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (isCtrlCmd && e.key === "0") {
        e.preventDefault();
        handleFit100();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch, goToNextPage, goToPrevPage, handleZoomIn, handleZoomOut, handleFit100]);

  // Pinch zoom support
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if ((e as any).ctrlKey || (e as any).metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setScale((prev) => Math.min(prev + 0.1, 5));
        } else {
          setScale((prev) => Math.max(prev - 0.1, 0.25));
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, []);

  // Show loader when page/scale/pdf changes; hide when PdfCanvas reports rendered
  useEffect(() => {
    // Show loader immediately on changes
    setIsLoading(true);

    // Fallback to hide loader in case PdfCanvas doesn't call back
    const fallback = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(fallback);
  }, [currentPage, scale, pdfPath]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <WorkspaceToolbar
        title={pdfName}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef as any}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        scale={scale}
        onDownload={handleDownload}
        onBack={() => navigate(-1)}
        onClose={() => navigate(-1)}
      />

      {/* PDF Content Area */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-auto bg-transparent flex flex-col items-center py-6 px-4 scroll-smooth"
        aria-busy={isLoading}
      >
        {/* Subtle centered spinner — low contrast and pointer-events-none */}
        {isLoading && (
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin opacity-80" aria-hidden="true" />
          </div>
        )}

        <div
          ref={contentRef}
          className="bg-transparent transition-all duration-200 w-full"
          style={{ maxWidth: "none" }}
        >
          <PdfCanvas
            pdfPath={pdfPath}
            scale={scale}
            pageNum={currentPage}
            containerWidth={containerWidth}
            onPageRender={(_page, total) => {
              setTotalPages(total);
              setIsLoading(false);
            }}
          />
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="bg-[#FFF7DA] border-t border-gray-300 p-3 flex items-center justify-center gap-4 sticky bottom-0 shadow-sm">
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 1}
          className="p-2 hover:bg-gray-200 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous page (←)"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const num = parseInt(e.target.value) || 1;
              setCurrentPage(Math.max(1, Math.min(num, totalPages)));
            }}
            className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm"
          />
          <span className="text-sm font-semibold">
            / {totalPages || "?"}
          </span>
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className="p-2 hover:bg-gray-200 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next page (→)"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
