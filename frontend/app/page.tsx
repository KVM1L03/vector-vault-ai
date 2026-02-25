"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";
import type { PDFViewerHandle } from "./components/PDFViewer";

const PDFViewer = dynamic(() => import("./components/PDFViewer"), { ssr: false });

type Source = {
  id: string;
  content: string;
  filename: string;
  chunk_index: number;
  page?: number;
};

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources?: Source[] };

export default function ChatWithPDFPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || loading) return;
      if (!uploadedFile || !activeFilename) {
        setError("Upload a PDF first.");
        return;
      }

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            top_k: 5,
            filename: activeFilename,
            include_full_content: true,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Request failed");
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer ?? "",
            sources: data.sources ?? [],
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [input, loading, uploadedFile, activeFilename]
  );

  const uploadFile = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      setUploadedFile(file);
      setActiveFilename(data.filename ?? null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file?.type === "application/pdf") uploadFile(file);
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfViewerRef = useRef<PDFViewerHandle>(null);

  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfPreviewUrl(null);
  }, [uploadedFile]);

  return (
    <div className="flex h-screen w-full bg-stone-50 font-sans text-stone-800">
      {/* Left: PDF upload + preview */}
      <div className="flex w-1/2 flex-col border-r border-stone-200 bg-white shadow-sm">
        {uploadedFile && pdfPreviewUrl ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-stone-50/80 px-4 py-3">
              <p className="truncate text-sm font-medium text-stone-800">
                {activeFilename ?? uploadedFile.name}
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="shrink-0 cursor-pointer rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 shadow-sm transition-colors hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Change PDF"}
              </label>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <PDFViewer
                ref={pdfViewerRef}
                url={pdfPreviewUrl}
                className="h-full w-full rounded-xl border border-stone-200 shadow-inner"
              />
            </div>
          </>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed
              m-8 bg-stone-50/80 p-12 transition-all duration-200
              ${isDragging ? "border-orange-400 bg-orange-50/70 shadow-inner" : "border-stone-200 hover:border-orange-200 hover:bg-orange-50/30"}
            `}
          >
            <div
              className={`rounded-full p-4 transition-colors ${isDragging ? "bg-orange-100" : "bg-stone-100"}`}
            >
              <FileUp
                className={`h-12 w-12 ${isDragging ? "text-orange-600" : "text-stone-500"}`}
                strokeWidth={1.5}
              />
            </div>
            <p className="text-center text-lg font-medium text-stone-800">
              Drop your PDF here or click to browse
            </p>
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="cursor-pointer rounded-xl border border-orange-200 bg-white px-5 py-2.5 text-sm font-medium text-orange-700 shadow-sm transition-colors hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Choose PDF"}
            </label>
          </div>
        )}
      </div>

      {/* Right: Chat */}
      <div className="flex w-1/2 flex-col bg-stone-50/50">
        <div className="flex flex-1 flex-col overflow-hidden rounded-l-2xl border border-stone-200 border-r-0 bg-white shadow-lg">
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-stone-500">
                <p className="text-center text-sm">
                  Upload a PDF and ask questions.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === "user"
                        ? "bg-orange-50 text-orange-900 border border-orange-100"
                        : "bg-stone-100 text-stone-800 border border-stone-100"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="space-y-2">
                        <div className="text-sm [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-stone-200 [&_code]:px-1 [&_code]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-stone-200 [&_pre]:p-2 [&_pre]:text-xs [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1,_h2,_h3]:font-semibold [&_h1,_h2,_h3]:mt-2">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((src) => (
                              <button
                                key={src.id}
                                type="button"
                                onClick={() =>
                                  pdfViewerRef.current?.goToSource({
                                    page: src.page,
                                    content: src.content,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-medium text-orange-800 shadow-sm transition-colors hover:bg-orange-50 hover:border-orange-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {src.filename}
                                {src.chunk_index >= 0 && ` #${src.chunk_index + 1}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="border-t border-stone-200 bg-stone-50/30 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your PDF..."
                disabled={loading}
                className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/25 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !uploadedFile || !activeFilename}
                className="rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-md transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-500"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
