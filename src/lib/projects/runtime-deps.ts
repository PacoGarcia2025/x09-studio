/** Versões NPM usadas no preview Sandpack e no build estático (publish). */
export const STUDIO_RUNTIME_DEPENDENCIES: Record<string, string> = {
  "@supabase/supabase-js": "^2.50.2",
  "lucide-react": "^0.468.0",
  "framer-motion": "^11.15.0",
  leaflet: "^1.9.4",
  "leaflet.markercluster": "^1.5.3",
  recharts: "^2.15.0",
  "react-is": "^18.3.1",
  clsx: "^2.1.1",
  "tailwind-merge": "^2.6.0",
};

export const STUDIO_RUNTIME_PACKAGE_NAMES = Object.keys(
  STUDIO_RUNTIME_DEPENDENCIES,
);
