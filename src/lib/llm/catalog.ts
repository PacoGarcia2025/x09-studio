export type AiProviderTier = "free" | "paid" | "hybrid";

export type AiProviderStatus = "active" | "ready-to-configure" | "planned";

export type AiProviderCatalogItem = {
  id: string;
  name: string;
  tier: AiProviderTier;
  status: AiProviderStatus;
  envVars: string[];
  strengths: string[];
  recommendedFor: string;
  models: string[];
};

export const aiProviderCatalog: AiProviderCatalogItem[] = [
  {
    id: "google-gemini",
    name: "Google Gemini",
    tier: "hybrid",
    status: "active",
    envVars: ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY"],
    strengths: ["custo baixo", "contexto grande", "velocidade"],
    recommendedFor: "Builder atual, geração de arquivos e análise rápida.",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
  },
  {
    id: "openai",
    name: "OpenAI",
    tier: "paid",
    status: "ready-to-configure",
    envVars: ["OPENAI_API_KEY"],
    strengths: ["qualidade geral", "tool calling", "produtos complexos"],
    recommendedFor: "Planner premium, raciocínio de produto e UX copy.",
    models: ["gpt-4.1", "gpt-4.1-mini", "o4-mini"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    tier: "paid",
    status: "ready-to-configure",
    envVars: ["ANTHROPIC_API_KEY"],
    strengths: ["código", "refatoração", "contexto longo"],
    recommendedFor: "Builder avançado, revisão de código e Auto Fix crítico.",
    models: ["claude-4-sonnet", "claude-4-opus"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    tier: "hybrid",
    status: "ready-to-configure",
    envVars: ["DEEPSEEK_API_KEY"],
    strengths: ["custo competitivo", "código", "raciocínio"],
    recommendedFor: "Geração econômica de features e tarefas em lote.",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "mistral",
    name: "Mistral",
    tier: "hybrid",
    status: "ready-to-configure",
    envVars: ["MISTRAL_API_KEY"],
    strengths: ["latência", "multilíngue", "modelos abertos"],
    recommendedFor: "Fluxos rápidos, classificação e automações internas.",
    models: ["mistral-large", "codestral"],
  },
  {
    id: "groq",
    name: "Groq",
    tier: "hybrid",
    status: "ready-to-configure",
    envVars: ["GROQ_API_KEY"],
    strengths: ["inferência muito rápida", "baixo custo", "open models"],
    recommendedFor: "Respostas instantâneas, logs, triagem e chat de suporte.",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tier: "hybrid",
    status: "ready-to-configure",
    envVars: ["OPENROUTER_API_KEY"],
    strengths: ["roteamento multi-modelo", "fallback", "comparação de modelos"],
    recommendedFor: "Marketplace de modelos pagos e gratuitos em uma API.",
    models: ["anthropic/*", "openai/*", "meta-llama/*", "google/*"],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    tier: "hybrid",
    status: "planned",
    envVars: ["HUGGINGFACE_API_KEY"],
    strengths: ["modelos abertos", "embeddings", "experimentos"],
    recommendedFor: "Recursos gratuitos, pesquisa e modelos especializados.",
    models: ["meta-llama/*", "qwen/*", "mistral/*"],
  },
  {
    id: "together",
    name: "Together AI",
    tier: "hybrid",
    status: "planned",
    envVars: ["TOGETHER_API_KEY"],
    strengths: ["open models", "fine-tuning", "preço competitivo"],
    recommendedFor: "Execução de modelos abertos com boa escala.",
    models: ["qwen", "llama", "mixtral"],
  },
  {
    id: "xai",
    name: "xAI Grok",
    tier: "paid",
    status: "planned",
    envVars: ["XAI_API_KEY"],
    strengths: ["raciocínio", "tempo real", "alternativa premium"],
    recommendedFor: "Camada premium opcional para usuários avançados.",
    models: ["grok-3", "grok-3-mini"],
  },
];

export const platformApiCatalog = [
  {
    name: "Supabase",
    envVars: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SECRET_KEY",
    ],
    purpose: "Auth, banco, profiles, workspaces e persistência do pipeline.",
  },
  {
    name: "Stripe",
    envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    purpose: "Planos pagos, créditos de IA e billing por uso.",
  },
  {
    name: "Resend",
    envVars: ["RESEND_API_KEY"],
    purpose: "E-mails transacionais, convites e notificações.",
  },
  {
    name: "Cloudflare",
    envVars: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "R2_*"],
    purpose: "DNS, SSL, domínio próprio, CDN e armazenamento de assets.",
  },
  {
    name: "GitHub",
    envVars: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET"],
    purpose: "Repositórios gerados, versionamento e integração com deploy.",
  },
  {
    name: "Observabilidade",
    envVars: ["SENTRY_DSN", "NEXT_PUBLIC_POSTHOG_KEY"],
    purpose: "Erros, métricas de produto, funis e saúde da plataforma.",
  },
];
