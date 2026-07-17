import type { SandpackProviderProps } from "@codesandbox/sandpack-react";

/** Dependências NPM no Sandpack — versões fixadas para previsibilidade. */
export const sandpackCustomSetup: SandpackProviderProps["customSetup"] = {
  dependencies: {
    "lucide-react": "0.468.0",
    recharts: "2.15.0",
    "react-is": "18.3.1",
    clsx: "2.1.1",
    "tailwind-merge": "2.6.0",
    "framer-motion": "11.15.0",
  },
};
