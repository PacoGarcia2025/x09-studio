/**
 * Remove blocos de código Markdown da resposta da IA para exibir só o texto no chat.
 * Também corta fence incompleto durante o streaming.
 */
export function stripCodeFencesForChat(content: string): string {
  if (!content) return "";

  // Remove fences fechados: ```lang ... ```
  let text = content.replace(/```[\s\S]*?```/g, "");

  // Fence ainda aberto (streaming): descarta do ``` até o fim
  const openFence = text.indexOf("```");
  if (openFence !== -1) {
    text = text.slice(0, openFence);
  }

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function hasVisibleChatProse(content: string): boolean {
  return stripCodeFencesForChat(content).length > 0;
}
