/** Recursos externos do preview Sandpack — replicados no publish estático (SSG). */
export const PUBLISH_HEAD_ASSETS = [
  `<script src="https://cdn.tailwindcss.com"></script>`,
  `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous" />`,
  `<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" crossorigin="anonymous" />`,
  `<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" crossorigin="anonymous" />`,
] as const;

/** Remove scripts corrompidos (ex.: src de imagem no lugar de /assets/*.js). */
export function sanitizePublishedIndexHtml(html: string): string {
  let out = html;

  out = out.replace(
    /<script[^>]*\ssrc=["']https:\/\/images\.unsplash\.com[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    "",
  );

  if (/<script[^>]*\ssrc=["']\/assets\/[^"']+\.js["']/i.test(out)) {
    out = out.replace(
      /<body>([\s\S]*?)<\/body>/i,
      (_full, inner: string) => {
        const cleaned = inner.replace(
          /<script[^>]*type=["']module["'][^>]*>\s*<\/script>\s*/gi,
          "",
        );
        const root = cleaned.includes('id="root"')
          ? cleaned
          : `${cleaned}\n    <div id="root"></div>`;
        return `<body>\n    ${root.trim()}\n  </body>`;
      },
    );
  }

  return out;
}

/** Injeta Tailwind CDN e CSS de mapas no index.html publicado (paridade com Sandpack). */
export function injectPublishHeadAssets(html: string): string {
  const sanitized = sanitizePublishedIndexHtml(html);
  if (sanitized.includes("cdn.tailwindcss.com")) return sanitized;

  const tags = PUBLISH_HEAD_ASSETS.join("\n    ");
  if (sanitized.includes("</head>")) {
    return sanitized.replace("</head>", `    ${tags}\n  </head>`);
  }
  return sanitized;
}
