import { NextRequest } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

/**
 * Proxies PDF upload to FastAPI POST /api/v1/upload
 * Backend returns { filename, chunks_count, message } – response is passed through.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.type !== "application/pdf") {
      return Response.json(
        { error: "PDF file required" },
        { status: 400 }
      );
    }

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API_BASE_URL}/api/v1/upload`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json(data, { status: res.status });
    }
    return Response.json(data);
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
