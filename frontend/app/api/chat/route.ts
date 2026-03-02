import type { NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

const TEXT_MSG_ID = "msg-1";

/**
 * Transforms backend stream (0: text, 2: sources, 3: error) to AI SDK data stream format (SSE).
 */
function transformBackendToUIMessageStream(
  stream: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let textStarted = false;
  let buffer = "";

  const formatSSE = (obj: object) =>
    encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const processLine = (
    line: string,
    controller: TransformStreamDefaultController<Uint8Array>
  ) => {
    if (!line.trim() || !line.includes(":")) return;
    const colonIdx = line.indexOf(":");
    const prefix = line.slice(0, colonIdx);
    const raw = line.slice(colonIdx + 1);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (prefix === "0") {
      if (!textStarted) {
        controller.enqueue(formatSSE({ type: "text-start", id: TEXT_MSG_ID }));
        textStarted = true;
      }
      controller.enqueue(
        formatSSE({
          type: "text-delta",
          id: TEXT_MSG_ID,
          delta: typeof parsed === "string" ? parsed : String(parsed),
        })
      );
    } else if (prefix === "2") {
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0];
      if (first && typeof first === "object" && "sources" in first) {
        controller.enqueue(formatSSE({ type: "data-sources", data: first }));
      }
    } else if (prefix === "3") {
      controller.enqueue(
        formatSSE({
          type: "error",
          errorText: typeof parsed === "string" ? parsed : String(parsed),
        })
      );
    }
  };

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          processLine(line, controller);
        }
      },
      flush(controller) {
        buffer += decoder.decode();
        if (buffer.trim()) processLine(buffer, controller);
        if (textStarted) {
          controller.enqueue(formatSSE({ type: "text-end", id: TEXT_MSG_ID }));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    })
  );
}

/**
 * Proxies to FastAPI POST /api/v1/ask (streaming)
 * Request: { query: string, top_k?: number, filename?: string, include_full_content?: boolean }
 * Response: AI SDK data stream (SSE with text-delta, data-sources, error)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, top_k = 5, filename, include_full_content } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return Response.json(
        { error: "query required" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      query: query.trim(),
      top_k,
    };
    if (filename != null) payload.filename = filename;
    if (include_full_content != null) payload.include_full_content = include_full_content;

    const res = await fetch(`${API_BASE_URL}/api/v1/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return Response.json(
        errData.detail ?? errData.error ?? "Request failed",
        { status: res.status }
      );
    }

    const transformedStream = transformBackendToUIMessageStream(res.body!);

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    );
  }
}
