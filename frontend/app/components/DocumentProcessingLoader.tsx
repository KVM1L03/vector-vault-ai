"use client";

import { useEffect, useState } from "react";
import { FileText, Layers, Search, Upload } from "lucide-react";

const STAGES = [
  {
    id: "upload",
    label: "Uploading document",
    detail: "Sending your PDF securely…",
    Icon: Upload,
  },
  {
    id: "extract",
    label: "Extracting text",
    detail: "Reading pages and layout…",
    Icon: FileText,
  },
  {
    id: "chunk",
    label: "Creating chunks",
    detail: "Splitting content for better answers…",
    Icon: Layers,
  },
  {
    id: "index",
    label: "Building search index",
    detail: "Almost ready to chat…",
    Icon: Search,
  },
] as const;

const STAGE_INTERVAL_MS = 2200;

type DocumentProcessingLoaderProps = {
  filename?: string | null;
  variant?: "panel" | "overlay";
};

export function DocumentProcessingLoader({
  filename,
  variant = "panel",
}: DocumentProcessingLoaderProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const stage = STAGES[stageIndex];
  const StageIcon = stage.Icon;
  const progress = ((stageIndex + 1) / STAGES.length) * 100;

  const content = (
    <div
      className="flex w-full max-w-sm flex-col items-center gap-6 px-6 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-[#F3D5AE] border-t-[#E17F2E] animate-spin"
          style={{ animationDuration: "0.9s" }}
          aria-hidden
        />
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(180deg, #FDE7CB, #FBD5A3)",
          }}
        >
          <StageIcon className="h-5 w-5 text-[#8A4A16]" strokeWidth={1.75} />
        </span>
      </div>

      <div className="flex w-full flex-col gap-2">
        <p className="text-lg font-semibold tracking-tight text-[#1C1C1E]">
          {stage.label}
        </p>
        <p className="text-sm text-[#8A857A]">{stage.detail}</p>
        {filename && (
          <p className="truncate text-[13px] font-medium text-[#A16207]">
            {filename}
          </p>
        )}
      </div>

      <div className="w-full space-y-3">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDE4D6]"
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #F5C07A 0%, #E17F2E 100%)",
            }}
          />
        </div>

        <ol className="flex w-full justify-between gap-1" aria-hidden>
          {STAGES.map((s, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <li
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                  done || active ? "bg-[#E17F2E]" : "bg-[#EDE4D6]"
                } ${active ? "opacity-100" : done ? "opacity-70" : "opacity-100"}`}
              />
            );
          })}
        </ol>
      </div>

      <p className="text-xs text-[#A8A29A]">
        This usually takes a few seconds
      </p>
    </div>
  );

  if (variant === "overlay") {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[22px] bg-[#FAF6F0]/88 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-[22px] border-2 border-dashed border-orange-200/70 bg-white/50 p-12">
      {content}
    </div>
  );
}
