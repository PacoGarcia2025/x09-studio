export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  result: ToolResult;
};

export type ToolResult = {
  ok: boolean;
  item?: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  warnings?: string[];
  nextAction?: "reuse" | "search" | "generate";
};

export function isToolResult(value: unknown): value is ToolResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ToolResult>;
  return typeof candidate.ok === "boolean" && Array.isArray(candidate.items);
}
