export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmCompleteInput = {
  messages: LlmMessage[];
  /** JSON Schema opcional — Sprint 2 usará para planos tipados */
  responseJsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

export type LlmCompleteResult = {
  text: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type LlmStreamInput = LlmCompleteInput & {
  signal?: AbortSignal;
  onDelta: (delta: string, accumulated: string) => void;
};

export type LlmStreamResult = LlmCompleteResult;

/**
 * Interface única de LLM. complete + stream opcional.
 */
export interface LlmProvider {
  readonly id: string;
  complete(input: LlmCompleteInput): Promise<LlmCompleteResult>;
  stream?(input: LlmStreamInput): Promise<LlmStreamResult>;
}

export type GenerationMode = "edit" | "fast" | "premium" | "repair" | "plan";
