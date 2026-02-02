import React from "react";
import { Search, X, ZoomIn, ZoomOut, Download, ChevronLeft } from "lucide-react";

type Props = {
  title?: string;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  scale: number;
  onDownload?: () => void;
  onBack?: () => void;
  onClose?: () => void;
};

export default function WorkspaceToolbar({
  title,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  onZoomIn,
  onZoomOut,
  scale,
  onDownload,
  onBack,
  onClose,
}: Props) {
  return (
    <div className="bg-[#FFF7DA] border-b border-gray-300 p-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          className="p-2 hover:bg-gray-200 rounded transition"
          onClick={onBack}
          title="Back"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="hidden sm:block font-semibold text-gray-800 capitalize">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {showSearch ? (
            <div className="bg-white border-b border-gray-200 rounded flex items-center px-2 shadow-sm">
              <Search size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ml-2 outline-none px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="p-2 hover:bg-gray-200 rounded transition"
                title="Close search"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              className="p-2 hover:bg-gray-200 rounded transition"
              onClick={() => {
                setShowSearch(true);
                setTimeout(() => searchInputRef?.current?.focus(), 40);
              }}
              title="Search (Ctrl/Cmd+F)"
            >
              <Search size={18} />
            </button>
          )}
        </div>

        <button title="Zoom out" className="p-2 hover:bg-gray-200 rounded transition" onClick={onZoomOut}>
          <ZoomOut size={18} />
        </button>
        <div className="px-2 py-1 bg-white text-sm rounded border">{Math.round(scale * 100)}%</div>
        <button title="Zoom in" className="p-2 hover:bg-gray-200 rounded transition" onClick={onZoomIn}>
          <ZoomIn size={18} />
        </button>

        <div className="border-l h-6 mx-2" />

        {onDownload && (
          <button onClick={onDownload} className="p-2 hover:bg-gray-200 rounded transition" title="Download">
            <Download size={18} />
          </button>
        )}

        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded transition" title="Close">
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
