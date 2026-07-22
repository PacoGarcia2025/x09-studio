import type { SandpackProviderProps } from "@codesandbox/sandpack-react";
import { STUDIO_RUNTIME_DEPENDENCIES } from "@/lib/projects/runtime-deps";

/** Pacotes NPM permitidos no preview Sandpack (única fonte de verdade). */
export const SANDPACK_ALLOWED_PACKAGES = new Set(
  Object.keys(STUDIO_RUNTIME_DEPENDENCIES),
);

/** Dependências fixadas — espelha visual-mvp + imobiliária. */
export const sandpackCustomSetup: SandpackProviderProps["customSetup"] = {
  dependencies: STUDIO_RUNTIME_DEPENDENCIES,
};

export const sandpackExternalResources = [
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
  "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
];
