export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
}

export interface AIResponse {
  success: boolean;
  text: string;
  error?: string;
}

export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}