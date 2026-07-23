/** Recursos externos do preview Sandpack — replicados no publish estático (SSG). */
export const PUBLISH_HEAD_ASSETS = [
  `<script src="https://cdn.tailwindcss.com"></script>`,
  `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous" />`,
  `<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" crossorigin="anonymous" />`,
  `<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" crossorigin="anonymous" />`,
] as const;

/** Injeta Tailwind CDN e CSS de mapas no index.html publicado (paridade com Sandpack). */
export function injectPublishHeadAssets(html: string): string {
  if (html.includes("cdn.tailwindcss.com")) return html;

  const tags = PUBLISH_HEAD_ASSETS.join("\n    ");
  if (html.includes("</head>")) {
    return html.replace("</head>", `    ${tags}\n  </head>`);
  }
  return html;
}
