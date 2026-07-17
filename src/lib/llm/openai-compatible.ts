import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmMessage,
  LlmProvider,
  LlmStreamInput,
  LlmStreamResult,
} from "./types";

type OpenAICompatibleConfig = {
  id: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  defaultHeaders?: Record<string, string>;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
};

function toPayloadMessages(messages: LlmMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string, accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException("Aborted", "AbortError");
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (!delta) continue;
        accumulated += delta;
        onDelta(delta, accumulated);
      } catch {
        // chunk parcial
      }
    }
  }

  return accumulated;
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
): LlmProvider {
  return {
    id: config.id,
    async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          ...config.defaultHeaders,
        },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          temperature: input.temperature ?? config.defaultTemperature ?? 0.7,
          max_tokens: input.maxOutputTokens ?? config.defaultMaxTokens ?? 8192,
          messages: toPayloadMessages(input.messages),
          ...(input.responseJsonSchema
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `${config.id} error (${response.status}): ${body.slice(0, 400)}`,
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        model?: string;
      };

      return {
        text: json.choices?.[0]?.message?.content ?? "",
        model: json.model ?? config.model,
        usage: {
          inputTokens: json.usage?.prompt_tokens,
          outputTokens: json.usage?.completion_tokens,
        },
      };
    },

    async stream(input: LlmStreamInput): Promise<LlmStreamResult> {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          ...config.defaultHeaders,
        },
        body: JSON.stringify({
          model: config.model,
          stream: true,
          temperature: input.temperature ?? config.defaultTemperature ?? 0.7,
          max_tokens: input.maxOutputTokens ?? config.defaultMaxTokens ?? 8192,
          messages: toPayloadMessages(input.messages),
        }),
        signal: input.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `${config.id} error (${response.status}): ${body.slice(0, 400)}`,
        );
      }

      if (!response.body) {
        throw new Error(`${config.id}: resposta sem corpo de stream`);
      }

      const text = await readSseStream(response.body, input.onDelta, input.signal);
      return { text, model: config.model };
    },
  };
}
