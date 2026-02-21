import type { NextRequest } from "next/server";
import axios from "axios";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

/**
 * Proxies to FastAPI POST /api/v1/ask
 * Request: { query: string, top_k?: number }
 * Response: { answer: string, sources?: Array<{ id, content, filename, chunk_index, page? }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, top_k = 5 } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return Response.json(
        { error: "query required" },
        { status: 400 }
      );
    }

    const { data } = await axios.post<{ answer: string }>(
      `${API_BASE_URL}/api/v1/ask`,
      { query: query.trim(), top_k },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    return Response.json(data);
  } catch (error) {
    console.error("Chat API error:", error);
    const message = axios.isAxiosError(error)
      ? error.response?.data?.detail ?? error.message
      : error instanceof Error ? error.message : "Request failed";
    return Response.json(
      { error: String(message) },
      { status: axios.isAxiosError(error) ? (error.response?.status ?? 500) : 500 }
    );
  }
}
