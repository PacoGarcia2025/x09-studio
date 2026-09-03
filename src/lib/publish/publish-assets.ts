/** Recursos externos do preview Sandpack — replicados no publish estático (SSG). */
export const PUBLISH_HEAD_ASSETS = [
  `<script src="https://cdn.tailwindcss.com"></script>`,
  `<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>`,
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

/** Injeta Tailwind, model-viewer e CSS de mapas no index.html publicado. */
export function injectPublishHeadAssets(html: string): string {
  let out = sanitizePublishedIndexHtml(html);
  const missing = PUBLISH_HEAD_ASSETS.filter((tag) => {
    if (tag.includes("cdn.tailwindcss.com")) {
      return !out.includes("cdn.tailwindcss.com");
    }
    if (tag.includes("model-viewer")) {
      return !out.includes("model-viewer");
    }
    if (tag.includes("leaflet@1.9.4/dist/leaflet.css")) {
      return !out.includes("leaflet@1.9.4/dist/leaflet.css");
    }
    if (tag.includes("MarkerCluster.Default.css")) {
      return !out.includes("MarkerCluster.Default.css");
    }
    if (tag.includes("MarkerCluster.css")) {
      return !out.includes("MarkerCluster.css");
    }
    return true;
  });
  if (missing.length === 0) return out;
  const tags = missing.join("\n    ");
  if (out.includes("</head>")) {
    return out.replace("</head>", `    ${tags}\n  </head>`);
  }
  return out;
}
