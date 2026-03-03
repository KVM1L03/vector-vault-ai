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
      className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-medium text-orange-800 shadow-sm transition-colors hover:bg-orange-50 hover:border-orange-300"
    >
      <ExternalLink className="h-3 w-3" />
      {filename}
      {chunk_index >= 0 && ` #${chunk_index + 1}`}
    </button>
  );
}
