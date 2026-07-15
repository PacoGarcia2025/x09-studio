type X09RobotProps = {
  compact?: boolean;
};

export function X09Robot({ compact = false }: X09RobotProps) {
  return (
    <div
      className={`relative mx-auto ${compact ? "h-44 w-44" : "h-[360px] w-full max-w-[460px]"}`}
      aria-label="Robô X09 trabalhando"
    >
      <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-3xl" />
      <div
        className="absolute inset-x-6 top-10 bottom-6 rounded-full border border-violet-400/20"
        style={{ animation: "x09-orbit 18s linear infinite" }}
      />
      <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(122,60,255,.18),transparent_66%)]" />

      <svg
        viewBox="0 0 420 420"
        className="relative h-full w-full drop-shadow-[0_0_42px_rgba(122,60,255,.35)]"
        role="img"
      >
        <defs>
          <linearGradient id="x09-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A855F7" />
            <stop offset="0.45" stopColor="#7A3CFF" />
            <stop offset="1" stopColor="#45C8FF" />
          </linearGradient>
          <linearGradient id="x09-screen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#121022" />
            <stop offset="1" stopColor="#05030B" />
          </linearGradient>
          <filter id="x09-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g style={{ animation: "x09-float 5s ease-in-out infinite" }}>
          <path
            d="M124 184c0-45 36-82 82-82h8c46 0 82 37 82 82v68c0 46-36 82-82 82h-8c-46 0-82-36-82-82v-68Z"
            fill="url(#x09-body)"
            opacity="0.95"
          />
          <path
            d="M145 188c0-31 25-56 56-56h18c31 0 56 25 56 56v32c0 31-25 56-56 56h-18c-31 0-56-25-56-56v-32Z"
            fill="url(#x09-screen)"
            stroke="rgba(255,255,255,.22)"
          />
          <circle cx="188" cy="203" r="10" fill="#34F5A4" filter="url(#x09-glow)" />
          <circle cx="232" cy="203" r="10" fill="#45C8FF" filter="url(#x09-glow)" />
          <path
            d="M186 235c18 13 38 13 56 0"
            fill="none"
            stroke="#A855F7"
            strokeLinecap="round"
            strokeWidth="6"
          />
          <path
            d="M210 102V70"
            stroke="#8B5CF6"
            strokeLinecap="round"
            strokeWidth="7"
          />
          <circle cx="210" cy="60" r="10" fill="#FF9D45" filter="url(#x09-glow)" />
          <path
            d="M122 226H86c-18 0-33 15-33 33v8"
            fill="none"
            stroke="#7A3CFF"
            strokeLinecap="round"
            strokeWidth="10"
          />
          <path
            d="M298 226h36c18 0 33 15 33 33v8"
            fill="none"
            stroke="#45C8FF"
            strokeLinecap="round"
            strokeWidth="10"
          />
        </g>

        <g opacity="0.88">
          <rect x="58" y="302" width="120" height="44" rx="14" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)" />
          <rect x="242" y="304" width="118" height="42" rx="14" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.14)" />
          <rect x="84" y="318" width="54" height="5" rx="3" fill="#34F5A4" style={{ animation: "x09-type 2.6s ease-in-out infinite" }} />
          <rect x="268" y="320" width="62" height="5" rx="3" fill="#45C8FF" style={{ animation: "x09-type 3s ease-in-out infinite" }} />
        </g>

        <g style={{ animation: "x09-pulse 3.8s ease-in-out infinite" }}>
          <path d="M52 118h76" stroke="#7A3CFF" strokeLinecap="round" strokeWidth="4" />
          <path d="M292 112h76" stroke="#34F5A4" strokeLinecap="round" strokeWidth="4" />
          <path d="M319 155h44" stroke="#FF9D45" strokeLinecap="round" strokeWidth="4" />
        </g>

        <rect
          x="120"
          y="118"
          width="180"
          height="178"
          rx="58"
          fill="transparent"
          stroke="rgba(255,255,255,.16)"
        />
        <rect
          x="120"
          y="118"
          width="72"
          height="178"
          rx="50"
          fill="rgba(255,255,255,.08)"
          style={{ animation: "x09-scan 4s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}
