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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, top_k: 5 }),
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
    [input, loading]
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
    <div className="flex h-screen w-full bg-slate-50 font-sans text-gray-800">
      {/* Left: PDF upload + preview */}
      <div className="flex w-1/2 flex-col border-r border-gray-200 bg-white">
        {uploadedFile && pdfPreviewUrl ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
              <p className="truncate text-sm font-medium text-gray-800">
                {uploadedFile.name}
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
                className="shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Change PDF"}
              </label>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <PDFViewer
                ref={pdfViewerRef}
                url={pdfPreviewUrl}
                className="h-full w-full rounded-lg border border-gray-200"
              />
            </div>
          </>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
              m-8 bg-gray-50/50 p-12 transition-colors
              ${isDragging ? "border-blue-400 bg-blue-50/50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
            `}
          >
            <div
              className={`rounded-full p-4 ${isDragging ? "bg-blue-100" : "bg-gray-100"}`}
            >
              <FileUp
                className={`h-12 w-12 ${isDragging ? "text-blue-600" : "text-gray-500"}`}
                strokeWidth={1.5}
              />
            </div>
            <p className="text-lg font-medium text-gray-800">
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
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Choose PDF"}
            </label>
          </div>
        )}
      </div>

      {/* Right: Chat */}
      <div className="flex w-1/2 flex-col">
        <div className="flex flex-1 flex-col overflow-hidden bg-white shadow-md">
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-gray-500">
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
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-50 text-blue-900"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="space-y-2">
                        <div className="text-sm [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-gray-200 [&_pre]:p-2 [&_pre]:text-xs [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1,_h2,_h3]:font-semibold [&_h1,_h2,_h3]:mt-2">
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
                                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
                  <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500 [animation-delay:300ms]" />
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

          <div className="border-t border-gray-200 p-4">
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
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
