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

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[72%] rounded-tl-[20px] rounded-tr-[20px] rounded-bl-[20px] rounded-br-[6px] px-[18px] py-3 text-[15px] leading-normal text-[#4A2A0C] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_18px_-10px_rgba(200,120,30,0.45),inset_0_1px_0_rgba(255,255,255,0.5)]"
          style={{ background: "linear-gradient(135deg, #FEE3BB, #FBC888)" }}
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[22px] border border-white/60 px-[26px] py-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
      }}
    >
      <div className="text-[15px] leading-[1.65] text-[#1C1C1E] [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-stone-200 [&_code]:px-1 [&_code]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-stone-200 [&_pre]:p-2 [&_pre]:text-xs [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1,_h2,_h3]:font-semibold [&_h1,_h2,_h3]:mt-2">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {text}
        </ReactMarkdown>
      </div>
      {sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
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
  );
};

export const ChatMessage = memo(ChatMessageInner);
