"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Square } from "lucide-react";
import dynamic from "next/dynamic";
import { ChatMessage } from "./components/ChatMessage";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import type { PDFViewerHandle } from "./components/PDFViewer";

const PDFViewer = dynamic(() => import("./components/PDFViewer"), { ssr: false });

function getTextFromMessage(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export default function ChatWithPDFPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfViewerRef = useRef<PDFViewerHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages: msgs, body }) => {
          const lastUser = [...msgs].reverse().find((m) => m.role === "user");
          const query = lastUser ? getTextFromMessage(lastUser) : "";
          const b = body as Record<string, unknown> | undefined;
          return {
            body: {
              query,
              top_k: 5,
              filename: b?.filename ?? null,
              include_full_content: b?.include_full_content ?? true,
            },
          };
        },
      }),
    []
  );

  const { messages, sendMessage, status, stop, error: chatError } = useChat({
    transport,
    onError: (err) => setError(err.message),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading) return;
      if (!uploadedFile || !activeFilename) {
        setError("Upload a PDF first.");
        return;
      }
      setError(null);
      setInput("");
      sendMessage(
        { text: trimmed },
        { body: { filename: activeFilename, include_full_content: true } }
      );
    },
    [input, isLoading, uploadedFile, activeFilename, sendMessage]
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

  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfPreviewUrl(null);
  }, [uploadedFile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const displayError = error ?? (chatError?.message ?? null);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-stone-50 font-sans text-stone-800 lg:flex-row">
      {/* Left: PDF upload + preview */}
      <div className="flex h-[45vh] min-h-[200px] w-full shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-1/2">
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
                key={pdfPreviewUrl}
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
      <div className="flex min-h-0 flex-1 flex-col bg-stone-50/50 lg:w-1/2">
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
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onSourceClick={(source) =>
                    pdfViewerRef.current?.goToSource(source)
                  }
                />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {displayError && (
            <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
              {displayError}
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
                disabled={isLoading}
                className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 placeholder-stone-400 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/25 disabled:opacity-60"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex items-center gap-2 rounded-xl border border-orange-300 bg-white px-6 py-3 font-medium text-orange-700 shadow-sm transition-colors hover:bg-orange-50"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || !uploadedFile || !activeFilename}
                  className="rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-md transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-500"
                >
                  Send
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
