export type ExperienceCompositionInput = {
  prompt: string;
  blueprint?: {
    industry?: string;
    productType?: string;
    experience?: string;
    modules?: string[];
  };
  patterns?: string[];
  resources?: Array<{
    id?: string;
    kind?: string;
    name?: string;
    provider?: string;
    source?: string;
    qualityScore?: number;
    reference?: {
      kind?: string;
      resourceId?: string;
      location?: string;
    };
  }>;
  creativeDirection?: {
    heading?: string;
    palette?: string[];
    motion?: string;
    copy?: string;
  };
};

export type ExperienceSection = {
  id: string;
  label: string;
  visualTone: string;
  purpose: string;
};

export function composeExperience(input: ExperienceCompositionInput) {
  const industry = input.blueprint?.industry ?? "genérico";
  const experience = input.blueprint?.experience ?? "premium";
  const primaryPattern = input.patterns?.[0] ?? "hero";
  const motionDirection = input.creativeDirection?.motion ?? primaryPattern;
  const selectedNames = (input.resources ?? []).slice(0, 6).map((resource) => resource.name ?? resource.id ?? "recurso");
  const selectedKinds = [...new Set((input.resources ?? []).map((resource) => resource.kind ?? "resource"))];
  const sections: ExperienceSection[] = [
    {
      id: "hero",
      label: "Hero",
      visualTone: `${experience} / ${motionDirection} / ${primaryPattern}`,
      purpose: `Apresentar ${industry} com foco em conversão, narrativa ${experience.toLowerCase()} e recursos ${selectedKinds.join(", ") || "visuais"}.`,
    },
    {
      id: "showcase",
      label: "Showcase",
      visualTone: `${input.creativeDirection?.motion ?? "editorial"} e sofisticado`,
      purpose: selectedNames.length > 0
        ? `Destacar diferenciais e recursos selecionados: ${selectedNames.join(", ")}.`
        : "Destacar diferenciais e produtos principais.",
    },
  ];

  return {
    summary: `Experiência ${experience} para ${industry} construído a partir de ${input.patterns?.join(", ") ?? "padrões básicos"}${selectedNames.length > 0 ? ` com recursos ${selectedNames.join(", ")}` : ""}.`,
    sections,
    resourceSummary: {
      selectedResourceNames: selectedNames,
      selectedResourceKinds: selectedKinds,
      selectedCount: selectedNames.length,
    },
  };
}
