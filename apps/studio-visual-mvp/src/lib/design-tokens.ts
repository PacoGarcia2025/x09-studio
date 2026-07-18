export const DESIGN_TOKENS = {
  colors: {
    // Fundo com leve gradiente de profundidade
    bg: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950",
    // Cards com vidro fosco premium
    card: "bg-white/[0.03] border border-white/10 backdrop-blur-md",
    border: "border-white/10",
    textPrimary: "text-white",
    textSecondary: "text-zinc-400",
    // Cores vibrantes estilo "SaaS moderno"
    accent: "bg-indigo-500 hover:bg-indigo-400 text-white",
    accentText: "text-white",
    accentSoft: "bg-indigo-500/15 text-indigo-300",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.3)]",
  },
  typography: {
    h1: "text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400",
    h2: "text-3xl font-semibold tracking-tight text-white",
    body: "text-zinc-400 leading-relaxed",
  },
  effects: {
    glass: "backdrop-blur-2xl border border-white/5 rounded-3xl",
    shadow: "shadow-2xl shadow-indigo-500/10",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.3)]",
  },
  /** Paletas de marca sugeridas — escolha UMA por projeto */
  brands: {
    indigo: {
      accent: "bg-indigo-500 hover:bg-indigo-400 text-white",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950",
      orb: "bg-indigo-500/30",
      ring: "ring-indigo-400/40",
    },
    cyan: {
      accent: "bg-cyan-400 hover:bg-cyan-300 text-zinc-950",
      gradient: "bg-gradient-to-br from-zinc-950 via-slate-900 to-cyan-600",
      orb: "bg-cyan-400/30",
      ring: "ring-cyan-400/40",
    },
    emerald: {
      accent: "bg-emerald-400 hover:bg-emerald-300 text-zinc-950",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-600",
      orb: "bg-emerald-400/30",
      ring: "ring-emerald-400/40",
    },
    rose: {
      accent: "bg-rose-500 hover:bg-rose-400 text-white",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-rose-600",
      orb: "bg-rose-500/30",
      ring: "ring-rose-400/40",
    },
    orange: {
      accent: "bg-orange-500 hover:bg-orange-400 text-zinc-950",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-600",
      orb: "bg-orange-500/30",
      ring: "ring-orange-400/40",
    },
  },
};
