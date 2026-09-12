export type DiscoveredHint = {
  label: string;
  score: number;
  reason: string;
};

export type DiscoveryEngineInput = {
  query: string;
  segment?: string;
  constraints?: string[];
};

export function discoverProjectHints(input: DiscoveryEngineInput) {
  const query = input.query.toLowerCase();
  const segment = (input.segment ?? "geral").toLowerCase();
  const constraints = (input.constraints ?? []).map((value) => value.toLowerCase());

  const hints: DiscoveredHint[] = [
    {
      label: `${segment} premium`,
      score: 95,
      reason: "A intenção combina posicionamento premium e nicho de mercado.",
    },
    {
      label: "hero cinematic",
      score: 88,
      reason: "A consulta menciona narrativa visual forte e destaque de produto.",
    },
    {
      label: "cards de imóveis",
      score: 82,
      reason: "O brief pede composição com cards e catálogo de imóveis.",
    },
  ].map((hint) => ({
    ...hint,
    score: hint.score + (query.includes((hint.label.split(" ")[0] ?? "").toLowerCase()) ? 5 : 0) + constraints.reduce((acc, current) => (hint.label.toLowerCase().includes(current) ? acc + 4 : acc), 0),
  }));

  return {
    ranked: hints.sort((a, b) => b.score - a.score),
    query,
  };
}
