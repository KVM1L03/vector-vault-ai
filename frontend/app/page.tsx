"use client";

import { FileUp } from "lucide-react";

export default function ChatWithPDFPage() {
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-gray-800">
      <div className="flex w-1/2 flex-col items-center justify-center border-r border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12">
          <div className="rounded-full bg-gray-100 p-4">
            <FileUp className="h-12 w-12 text-gray-500" strokeWidth={1.5} />
          </div>
          <p className="text-lg font-medium text-gray-800">Drop your PDF here</p>
        </div>
      </div>
      <div className="flex w-1/2 flex-col items-center justify-center p-8">
        <p className="text-gray-500">Chat interface</p>
      </div>
    </div>
  );
}