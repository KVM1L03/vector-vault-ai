"use client";

import * as pdfjsLib from "pdfjs-dist";
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
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-stone-600">
          Page {currentPage} / {numPages}
        </span>
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
          disabled={currentPage >= numPages}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        <div ref={containerRef} className="flex justify-start">
          <canvas />
        </div>
      </div>
    </div>
  );
});

export default PDFViewer;
