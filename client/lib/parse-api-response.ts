/**
 * Reads a fetch Response body safely when the server may return HTML or plain text.
 */
export async function parseApiJsonBody(res: Response): Promise<{
  json: Record<string, unknown> | null;
  rawSnippet: string;
}> {
  const text = await res.text();
  if (!text.trim()) {
    return { json: null, rawSnippet: "" };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { json: parsed as Record<string, unknown>, rawSnippet: "" };
    }
    return { json: null, rawSnippet: text.slice(0, 160) };
  } catch {
    return { json: null, rawSnippet: text.slice(0, 160) };
  }
}
