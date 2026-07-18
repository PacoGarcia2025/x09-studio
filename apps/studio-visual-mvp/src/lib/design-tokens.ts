export const DESIGN_TOKENS = {
  colors: {
    bg: "bg-zinc-950",
    card: "bg-zinc-900/50",
    border: "border-white/10",
    textPrimary: "text-white",
    textSecondary: "text-zinc-400",
    /** Accent de marca padrão — a IA PODE e DEVE trocar por cor do produto */
    accent: "bg-orange-500",
    accentText: "text-zinc-950",
    accentSoft: "bg-orange-500/15 text-orange-300",
  },
  typography: {
    h1: "text-5xl md:text-7xl font-bold tracking-tighter text-white",
    h2: "text-3xl md:text-4xl font-semibold tracking-tight text-white",
    body: "text-zinc-400 leading-relaxed",
  },
  effects: {
    glass: "backdrop-blur-xl border border-white/10 rounded-2xl",
    shadow: "shadow-2xl shadow-black/50",
    glow: "shadow-[0_0_60px_-12px_rgba(249,115,22,0.55)]",
  },
  /** Paletas de marca sugeridas — escolha UMA por projeto */
  brands: {
    orange: {
      accent: "bg-orange-500",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-600",
      orb: "bg-orange-500/30",
      ring: "ring-orange-400/40",
    },
    cyan: {
      accent: "bg-cyan-400",
      gradient: "bg-gradient-to-br from-zinc-950 via-slate-900 to-cyan-600",
      orb: "bg-cyan-400/30",
      ring: "ring-cyan-400/40",
    },
    emerald: {
      accent: "bg-emerald-400",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-600",
      orb: "bg-emerald-400/30",
      ring: "ring-emerald-400/40",
    },
    rose: {
      accent: "bg-rose-500",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-rose-600",
      orb: "bg-rose-500/30",
      ring: "ring-rose-400/40",
    },
    violet: {
      accent: "bg-violet-500",
      gradient: "bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-600",
      orb: "bg-violet-500/30",
      ring: "ring-violet-400/40",
    },
  },
};
