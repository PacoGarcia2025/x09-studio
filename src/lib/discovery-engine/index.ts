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

export type DiscoveryEvaluation = {
  isSufficient: boolean;
  missingFields: string[];
  questions: string[];
  prompt: string;
};

export function evaluateDiscoveryNeeds(input: DiscoveryEngineInput): DiscoveryEvaluation {
  const query = input.query.trim();
  const lower = query.toLowerCase();

  const containsDetailedScope =
    /cardapio|cardápio|pedidos|clientes|entrega|admin|painel|dashboard|com|completo|sistema/i.test(lower) &&
    query.length >= 35;

  const isVagueShort = query.length < 35 && !containsDetailedScope;
  const isGenericPrompt = /^(crie|faça|monte|gere)\s+(um|uma)?\s+(site|app|sistema|landing)(\s+para\s+uma?\s+\w+)?\.?$/i.test(query);

  if ((isVagueShort || isGenericPrompt) && !containsDetailedScope) {
    return {
      isSufficient: false,
      missingFields: ["nome_marca", "funcionalidades_especificas", "localizacao_contato"],
      questions: [
        "Qual é o nome oficial da sua empresa ou projeto?",
        "Quais módulos ou funcionalidades principais você precisa (ex.: cardápio digital, pedidos, painel admin)?",
        "Qual a sua cidade ou telefone de contato para exibição no sistema?",
      ],
      prompt: query,
    };
  }

  return {
    isSufficient: true,
    missingFields: [],
    questions: [],
    prompt: query,
  };
}

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
