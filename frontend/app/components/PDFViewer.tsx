"use client";

import * as pdfjsLib from "pdfjs-dist";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";

// PDF.js worker for Next.js
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export type SourceRef = { page?: number; content?: string };

export type PDFViewerHandle = {
  goToSource: (source: SourceRef) => Promise<void>;
};

type Props = {
  url: string;
  className?: string;
};

const PDFViewer = forwardRef<PDFViewerHandle, Props>(function PDFViewer(
  { url, className = "" },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const findPageByContent = useCallback(
    async (searchText: string): Promise<number | null> => {
      if (!pdfDoc) return null;
      const normalized = searchText.replace(/\s+/g, " ").trim();
      if (!normalized) return null;

      const tryMatch = (pageText: string, search: string) =>
        search.length >= 15 && pageText.includes(search);

      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ");

        if (tryMatch(pageText, normalized)) return p;
        if (tryMatch(pageText, normalized.slice(0, 150))) return p;
        if (tryMatch(pageText, normalized.slice(0, 80))) return p;
        if (tryMatch(pageText, normalized.slice(0, 50))) return p;
      }
      return null;
    },
    [pdfDoc]
  );

  const goToSource = useCallback(
    async (source: SourceRef) => {
      if (source.page != null) {
        setCurrentPage(Math.max(1, Math.min(source.page, numPages)));
        return;
      }
      if (source.content) {
        const page = await findPageByContent(source.content);
        if (page) setCurrentPage(page);
      }
    },
    [numPages, findPageByContent]
  );

  useImperativeHandle(ref, () => ({ goToSource }), [goToSource]);

  useEffect(() => {
    let cancelled = false;

    pdfjsLib
      .getDocument({ url })
      .promise.then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load PDF");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [loading, error]);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const canvas = containerRef.current.querySelector("canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    pdfDoc.getPage(currentPage).then((page) => {
      if (cancelled) return;
      const defaultViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, containerWidth / defaultViewport.width);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const task = page.render({ canvas, canvasContext: ctx, viewport });
      renderTask = task;
      Promise.resolve(task).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (/rendering cancelled|cancelled/i.test(msg)) return;
        console.error("PDF render error:", err);
      });
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, currentPage, containerWidth]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-stone-500">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      <div className="flex shrink-0 justify-center border-b border-black/5 bg-gradient-to-b from-white/60 to-white/0 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-0.5 rounded-full border border-white/70 bg-white/55 p-[3px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="flex h-[26px] w-[30px] items-center justify-center rounded-full text-[#1C1C1E] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <span className="rounded-full bg-gradient-to-b from-white to-[#faf8f5] px-3.5 py-1 text-[12.5px] font-semibold text-[#1C1C1E] shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]">
            Page {currentPage} of {numPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            aria-label="Next page"
            className="flex h-[26px] w-[30px] items-center justify-center rounded-full text-[#1C1C1E] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-auto px-6 py-5">
        <div ref={containerRef} className="flex justify-center">
          <canvas />
        </div>
      </div>
    </div>
  );
});

export default PDFViewer;
