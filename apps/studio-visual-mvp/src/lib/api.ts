const mockResponse = `Perfeito! Vou criar um Header moderno para o seu projeto com a identidade do x09.

\`\`\`tsx path="/components/Header.tsx"
export default function Header() {
  return (
    <header className="w-full h-16 bg-surface border-b border-border flex items-center px-6">
      <h1 className="text-accent font-bold text-xl">x09 Studio</h1>
    </header>
  );
}
\`\`\`

Agora você pode importar este componente no seu \`App.tsx\`!`;

/**
 * Simula streaming SSE/ReadableStream caractere a caractere.
 * Troque o corpo desta função por um fetch real quando a API estiver pronta.
 */
export function streamAIResponse(
  onChunk: (text: string) => void,
  onFinish: (text: string) => void,
): void {
  let index = 0;
  let accumulated = "";

  const intervalId = window.setInterval(() => {
    if (index >= mockResponse.length) {
      window.clearInterval(intervalId);
      onFinish(accumulated);
      return;
    }

    accumulated += mockResponse[index];
    index += 1;
    onChunk(accumulated);
  }, 30);
}
