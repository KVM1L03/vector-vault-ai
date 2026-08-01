"use client";

import { ExternalLink } from "lucide-react";

export type SourceBadgeProps = {
  filename: string;
  chunk_index: number;
  content?: string;
  page?: number;
  onClick: () => void;
};

export function SourceBadge({
  filename,
  chunk_index,
  onClick,
}: SourceBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[rgba(230,150,70,0.3)] py-1.5 pl-2.5 pr-3 text-[12.5px] font-semibold text-[#8A4A16] shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.7)] transition-opacity hover:opacity-90"
      style={{ background: "linear-gradient(180deg, #FEEBD0, #FBDBAC)" }}
    >
      <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
      {filename}
      {chunk_index >= 0 && ` #${chunk_index + 1}`}
    </button>
  );
}
