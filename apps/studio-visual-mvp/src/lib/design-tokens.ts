export const DESIGN_TOKENS = {
  colors: {
    bg: "bg-[#0A0A0B]",
    surface: "bg-[#111113]",
    card: "bg-[#1A1A1F] border border-[#27272A]",
    border: "border-[#27272A]",
    textPrimary: "text-[#F8FAFC]",
    textSecondary: "text-[#CBD5E1]",
    accent: "bg-violet-600 hover:bg-violet-700 text-white",
    accentText: "text-white",
    accentSoft: "bg-violet-600/15 text-violet-200",
    glow: "shadow-[0_0_28px_rgba(124,58,237,0.28)]",
    success: "text-emerald-400",
  },
  typography: {
    h1: "text-5xl md:text-7xl font-bold tracking-[-0.045em] text-[#F8FAFC]",
    h2: "text-3xl font-semibold tracking-tight text-[#F8FAFC]",
    body: "text-[#CBD5E1] leading-relaxed",
  },
  effects: {
    glass: "backdrop-blur-2xl border border-white/5 rounded-2xl",
    shadow: "shadow-2xl shadow-violet-950/20",
    glow: "shadow-[0_0_28px_rgba(124,58,237,0.28)]",
  },
  /** Paletas sugeridas para os apps gerados; o Studio usa violet. */
  brands: {
    violet: {
      accent: "bg-violet-600 hover:bg-violet-700 text-white",
      gradient: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600",
      orb: "bg-violet-600/30",
      ring: "ring-violet-500/40",
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
