import type { SandpackProviderProps } from "@codesandbox/sandpack-react";

/** Dependências NPM disponíveis no preview Sandpack (IA pode importar estas libs). */
export const sandpackCustomSetup: SandpackProviderProps["customSetup"] = {
  dependencies: {
    "lucide-react": "latest",
    recharts: "latest",
    clsx: "latest",
    "tailwind-merge": "latest",
    "framer-motion": "latest",
  },
};
