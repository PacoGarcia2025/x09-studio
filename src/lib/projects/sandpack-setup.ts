import type { SandpackProviderProps } from "@codesandbox/sandpack-react";

/** Pacotes NPM permitidos no preview Sandpack (única fonte de verdade). */
export const SANDPACK_ALLOWED_PACKAGES = new Set([
  "@supabase/supabase-js",
  "lucide-react",
  "framer-motion",
  "leaflet",
  "leaflet.markercluster",
  "recharts",
  "react-is",
  "clsx",
  "tailwind-merge",
]);

/** Dependências fixadas — espelha visual-mvp + imobiliária. */
export const sandpackCustomSetup: SandpackProviderProps["customSetup"] = {
  dependencies: {
    "@supabase/supabase-js": "^2.50.2",
    "lucide-react": "^0.468.0",
    "framer-motion": "^11.15.0",
    leaflet: "^1.9.4",
    "leaflet.markercluster": "^1.5.3",
    recharts: "^2.15.0",
    "react-is": "^18.3.1",
    clsx: "^2.1.1",
    "tailwind-merge": "^2.6.0",
  },
};

export const sandpackExternalResources = [
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
];
