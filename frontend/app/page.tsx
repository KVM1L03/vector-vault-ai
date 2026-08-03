"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, FileUp, Square } from "lucide-react";
import dynamic from "next/dynamic";
import { ChatMessage } from "./components/ChatMessage";
import { DocumentProcessingLoader } from "./components/DocumentProcessingLoader";
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
  const [pendingFilename, setPendingFilename] = useState<string | null>(null);
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
    setPendingFilename(file.name);
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
      setPendingFilename(null);
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
    <div
      className="flex h-screen w-full flex-col overflow-hidden font-sans text-[#1C1C1E] lg:flex-row"
      style={{
        background:
          "radial-gradient(circle at 15% 0%, #FFF6EA 0%, #FAF6F0 35%, #F3ECE1 100%)",
      }}
    >
      {/* Left: PDF upload + preview */}
      <div className="flex h-[45vh] min-h-[200px] w-full shrink-0 flex-col gap-4 p-4 lg:h-full lg:min-h-0 lg:w-1/2 lg:p-6">
        {uploadedFile && pdfPreviewUrl ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-[#1C1C1E]">
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
                aria-disabled={uploading}
                className={`shrink-0 whitespace-nowrap rounded-full border border-white/60 px-4 py-2 text-[13.5px] font-semibold text-[#8A4A16] shadow-sm transition-opacity ${
                  uploading
                    ? "pointer-events-none cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:opacity-90"
                }`}
                style={{
                  background: "linear-gradient(180deg, #FDE7CB, #FBD5A3)",
                }}
              >
                {uploading ? "Processing…" : "Change PDF"}
              </label>
            </div>
            {uploadError && (
              <p className="shrink-0 text-sm text-red-600">{uploadError}</p>
            )}
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[22px] border border-white/70 bg-gradient-to-b from-white to-[#fdfcfa] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.05),0_30px_60px_-24px_rgba(80,55,25,0.28)]">
              <PDFViewer
                key={pdfPreviewUrl}
                ref={pdfViewerRef}
                url={pdfPreviewUrl}
                className="h-full w-full"
              />
              {uploading && (
                <DocumentProcessingLoader
                  filename={pendingFilename}
                  variant="overlay"
                />
              )}
            </div>
          </>
        ) : uploading ? (
          <DocumentProcessingLoader filename={pendingFilename} />
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex flex-1 flex-col items-center justify-center gap-5 rounded-[22px] border-2 border-dashed
              p-12 transition-all duration-200
              ${isDragging ? "border-orange-400 bg-orange-50/60 shadow-inner" : "border-orange-200/60 bg-white/40 hover:border-orange-300 hover:bg-orange-50/30"}
            `}
          >
            <div
              className={`rounded-full p-4 transition-colors ${isDragging ? "bg-orange-100" : "bg-white/70"}`}
            >
              <FileUp
                className={`h-12 w-12 ${isDragging ? "text-orange-600" : "text-[#A8A29A]"}`}
                strokeWidth={1.5}
              />
            </div>
            <p className="text-center text-lg font-medium text-[#1C1C1E]">
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
              className="cursor-pointer rounded-full border border-white/60 px-5 py-2.5 text-sm font-semibold text-[#8A4A16] shadow-sm transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(180deg, #FDE7CB, #FBD5A3)",
              }}
            >
              Choose PDF
            </label>
          </div>
        )}
      </div>

      {/* Right: Chat */}
      <div
        className="flex min-h-0 flex-1 flex-col border-l border-black/[0.06] lg:w-1/2"
        style={{
          background: "linear-gradient(180deg, #FDFBF8, #F6F0E6)",
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-8">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-[#8A857A]">
                <p className="text-center text-sm">
                  Upload a PDF and ask questions.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-5">
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
                <div className="flex gap-1.5 px-1 py-2">
                  <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#D7CFC3]" />
                  <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#D7CFC3] [animation-delay:150ms]" />
                  <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#D7CFC3] [animation-delay:300ms]" />
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

          <div className="shrink-0 px-6 pb-6 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              className="flex items-center gap-2 rounded-full border border-white/70 bg-white/65 py-1.5 pl-5 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-14px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your PDF..."
                disabled={isLoading}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1C1C1E] outline-none placeholder:text-[#A8A29A] disabled:opacity-60"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white text-[#8A4A16] shadow-sm transition-opacity hover:opacity-90"
                  aria-label="Stop generating"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || !uploadedFile || !activeFilename}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 text-white shadow-[0_2px_8px_rgba(226,130,40,0.45),inset_0_1px_0_rgba(255,255,255,0.5)] transition-opacity disabled:cursor-not-allowed disabled:opacity-55"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 28%, #FFC38A, #F2994A 55%, #E17F2E)",
                  }}
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
