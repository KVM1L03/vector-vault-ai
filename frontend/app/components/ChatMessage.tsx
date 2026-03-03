"use client";

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { UIMessage } from "ai";
import { SourceBadge } from "./SourceBadge";

type Source = {
  id: string;
  content: string;
  filename: string;
  chunk_index: number;
  page?: number;
};

function getTextFromMessage(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function getSourcesFromMessage(msg: UIMessage): Source[] {
  for (const part of msg.parts ?? []) {
    if (
      part.type === "data-sources" &&
      part.data &&
      typeof part.data === "object" &&
      "sources" in part.data
    ) {
      const sources = (part.data as { sources: Source[] }).sources;
      return Array.isArray(sources) ? sources : [];
    }
  }
  return [];
}

export type ChatMessageProps = {
  message: UIMessage;
  onSourceClick: (source: { page?: number; content?: string }) => void;
};

const ChatMessageInner = ({ message, onSourceClick }: ChatMessageProps) => {
  const text = getTextFromMessage(message);
  const sources = getSourcesFromMessage(message);

  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          message.role === "user"
            ? "bg-orange-50 text-orange-900 border border-orange-100"
            : "bg-stone-100 text-stone-800 border border-stone-100"
        }`}
      >
        {message.role === "assistant" ? (
          <div className="space-y-2">
            <div className="text-sm [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-stone-200 [&_code]:px-1 [&_code]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-stone-200 [&_pre]:p-2 [&_pre]:text-xs [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1,_h2,_h3]:font-semibold [&_h1,_h2,_h3]:mt-2">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {text}
              </ReactMarkdown>
            </div>
            {sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sources.map((src) => (
                  <SourceBadge
                    key={src.id}
                    filename={src.filename}
                    chunk_index={src.chunk_index}
                    content={src.content}
                    page={src.page}
                    onClick={() =>
                      onSourceClick({ page: src.page, content: src.content })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{text}</p>
        )}
      </div>
    </div>
  );
};

export const ChatMessage = memo(ChatMessageInner);
