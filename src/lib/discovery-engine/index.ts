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

  // Verifica se o prompt possui os dados essenciais reais de negócio (contato/rede social, endereço/cidade, logomarca/assets)
  const hasRealContactData =
    /\(?(?:[1-9]{2})\)?\s*(?:9\d{4}|\d{4})[-.\s]?\d{4}|whatsapp|contato@|instagram|@[\w.-]+|rua|avenida|bairro|cep|cidade/i.test(
      query,
    );
  const hasAssetInstructions = /logo|logotipo|minha foto|minhas fotos|usar imagem|galeria própria|fotos do produto/i.test(
    query,
  );
  const hasExplicitSkip = /pode usar mock|dados ficticios|dados de exemplo|dados de teste|sem perguntas|gerar direto/i.test(
    query,
  );

  const missingFields: string[] = [];
  const questions: string[] = [];

  if (!hasRealContactData && !hasExplicitSkip) {
    missingFields.push("contato_localizacao");
    questions.push(
      "Qual é o WhatsApp/telefone, e-mail, endereço ou cidade da empresa para exibição no sistema?",
    );
  }

  if (!hasAssetInstructions && !hasExplicitSkip) {
    missingFields.push("logo_imagens");
    questions.push(
      "Você possui logotipo próprio ou fotos reais dos seus produtos que deseja incluir, ou podemos usar imagens profissionais de stock do setor?",
    );
  }

  if (
    !/instagram|facebook|social|rede social/i.test(lower) &&
    !hasExplicitSkip &&
    query.length < 150
  ) {
    missingFields.push("redes_sociais");
    questions.push(
      "Possui perfil no Instagram ou outras redes sociais que deseja exibir no cabeçalho ou rodapé?",
    );
  }

  if (
    !/desconto|promoção|promocao|oferta|destaque/i.test(lower) &&
    !hasExplicitSkip &&
    query.length < 150
  ) {
    missingFields.push("promocoes_destaque");
    questions.push(
      "Existe alguma promoção especial, combo ou oferta de boas-vindas que você gostaria de destacar na tela inicial?",
    );
  }

  if (missingFields.length > 0 && !hasExplicitSkip) {
    return {
      isSufficient: false,
      missingFields,
      questions,
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
