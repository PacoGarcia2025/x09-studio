export type EcosystemStatus = "connected" | "available" | "planned";

export type EcosystemConnector = {
  id: string;
  name: string;
  category: string;
  status: EcosystemStatus;
  description: string;
  envVars: string[];
  automation: string[];
};

export const ecosystemConnectors: EcosystemConnector[] = [
  {
    id: "ai-router",
    name: "AI Router",
    category: "Inteligência Artificial",
    status: "available",
    description:
      "Camada interna que escolhe automaticamente o melhor modelo para planejamento, construção, revisão, UX, SEO e fallback.",
    envVars: ["GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"],
    automation: ["Planejamento", "Builder", "Verify", "Fix", "UX", "SEO", "Fallback"],
  },
  {
    id: "claude",
    name: "Claude",
    category: "Inteligência Artificial",
    status: "available",
    description: "Modelo premium para raciocínio, código, refatoração e tarefas críticas.",
    envVars: ["ANTHROPIC_API_KEY"],
    automation: ["Planejamento", "Builder", "Auto Fix"],
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "Inteligência Artificial",
    status: "available",
    description: "Modelo premium para experiência de usuário, copy, produto e tool calling.",
    envVars: ["OPENAI_API_KEY"],
    automation: ["UX", "Produto", "Chat", "SEO"],
  },
  {
    id: "gemini",
    name: "Gemini",
    category: "Inteligência Artificial",
    status: "connected",
    description: "Provider atual do Studio para geração e análise com bom custo e velocidade.",
    envVars: ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY"],
    automation: ["Builder", "SEO", "Análise rápida"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    category: "Inteligência Artificial",
    status: "available",
    description: "Gateway multi-modelo para fallback e acesso a modelos pagos e gratuitos.",
    envVars: ["OPENROUTER_API_KEY"],
    automation: ["Fallback", "Roteamento", "Comparação de modelos"],
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "Backend e Dados",
    status: "connected",
    description: "Auth, banco, storage, profiles, workspaces e persistência do pipeline.",
    envVars: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SECRET_KEY",
    ],
    automation: ["Auth", "Banco", "Storage", "Workspaces"],
  },
  {
    id: "github",
    name: "GitHub",
    category: "Código e Versionamento",
    status: "available",
    description: "Repositórios por projeto, commits automáticos, branches e histórico de versões.",
    envVars: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET"],
    automation: ["Criar repo", "Commit", "Rollback", "Deploy hooks"],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "Domínios e Publicação",
    status: "available",
    description: "DNS, domínio próprio, SSL, CDN, proxy e automação de publicação.",
    envVars: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"],
    automation: ["DNS", "SSL", "Domínio próprio", "CDN"],
  },
  {
    id: "docker",
    name: "Docker Preview",
    category: "Preview e Runtime",
    status: "planned",
    description: "Ambientes isolados para preview em tempo real de cada sistema gerado.",
    envVars: ["STUDIO_DOCKER_NETWORK", "STUDIO_PREVIEW_IDLE_MS"],
    automation: ["Preview isolado", "Restart", "Idle shutdown"],
  },
  {
    id: "vps",
    name: "SSH / VPS",
    category: "Deploy",
    status: "available",
    description: "Deploy em servidor próprio, reload de serviços e validação pós-publicação.",
    envVars: ["VPS_HOST", "VPS_USER", "VPS_SSH_KEY"],
    automation: ["Deploy", "Health check", "Rollback"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Billing",
    status: "available",
    description: "Planos, créditos de IA, cobrança por uso e upgrades de workspace.",
    envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    automation: ["Assinaturas", "Créditos", "Webhooks"],
  },
  {
    id: "resend",
    name: "Resend",
    category: "Comunicação",
    status: "available",
    description: "E-mails transacionais, convites, alertas e mensagens de publicação.",
    envVars: ["RESEND_API_KEY"],
    automation: ["Convites", "Notificações", "Publicação"],
  },
];

export const aiRouterAssignments = [
  { task: "Planejamento", provider: "Claude", reason: "melhor raciocínio estrutural" },
  { task: "Builder", provider: "Claude", reason: "melhor precisão em código" },
  { task: "Verify", provider: "Groq", reason: "baixa latência para triagem" },
  { task: "Auto Fix", provider: "Claude", reason: "correções mais seguras" },
  { task: "UX", provider: "OpenAI", reason: "copy, produto e experiência" },
  { task: "SEO", provider: "Gemini", reason: "rápido e econômico" },
  { task: "Fallback", provider: "OpenRouter", reason: "roteamento multi-modelo" },
];

export const publishingSteps = [
  "Escolher destino",
  "Validar domínio",
  "Configurar Cloudflare",
  "Criar DNS",
  "Emitir SSL",
  "Publicar",
];
