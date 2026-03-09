export async function safeParseJson<T extends Record<string, unknown>>(
  res: Response,
  fallback: T
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    return { ...fallback, error: text || res.statusText } as T;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return { ...fallback, error: "Invalid JSON response" } as T;
  }
}
