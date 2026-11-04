export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AskLlmOptions {
  maxTokens?: number;
  json?: boolean;
}

export interface AskLlmResult {
  content: string;
  model: string;
}

const TIMEOUT_MS = 120_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`LLM is not configured: set ${name} in .env.local (see .env.example).`);
  }
  return value.trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * The ONE entry point for all AI in MeCap. Talks to any OpenAI-compatible
 * /chat/completions endpoint with plain fetch. Server-side only: it reads
 * LLM_BASE_URL / LLM_MODEL / LLM_API_KEY from the environment and never
 * logs or echoes them.
 */
export async function askLLM(
  messages: LlmMessage[],
  opts: AskLlmOptions = {},
): Promise<AskLlmResult> {
  const baseUrl = requireEnv("LLM_BASE_URL").replace(/\/+$/, "");
  const model = requireEnv("LLM_MODEL");
  const apiKey = requireEnv("LLM_API_KEY");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: opts.maxTokens ?? 512,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("The local model did not answer within 120 seconds.");
      }
      throw new Error(
        `Could not reach the LLM server: ${err instanceof Error ? err.message : "unknown network error"}`,
      );
    }

    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.text()).slice(0, 200);
      } catch {
        // ignore body read errors
      }
      throw new Error(`LLM server responded with HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error("LLM server returned a response that is not valid JSON.");
    }
    if (!isRecord(data) || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error("LLM server response is missing choices.");
    }
    const choice = data.choices[0];
    const content =
      isRecord(choice) && isRecord(choice.message) ? choice.message.content : undefined;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("LLM server returned an empty message.");
    }
    const responseModel = typeof data.model === "string" && data.model !== "" ? data.model : model;
    return { content, model: responseModel };
  } finally {
    clearTimeout(timer);
  }
}
