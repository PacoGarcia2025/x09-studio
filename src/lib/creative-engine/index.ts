export type CreativeDirectionInput = {
  prompt: string;
  blueprint?: { industry?: string; experience?: string };
  patterns?: string[];
};

export function buildCreativeDirection(input: CreativeDirectionInput) {
  const industry = input.blueprint?.industry ?? "geral";
  const experience = input.blueprint?.experience ?? "premium";
  const primaryPattern = input.patterns?.[0] ?? "hero-cinematic";

  return {
    heading: `${experience} ${industry}`,
    palette: ["#0F172A", "#E2B36B", "#F8FAFC"],
    motion: primaryPattern.includes("hero") ? "cinematic" : "subtle premium",
    copy: `Direção criativa para ${industry} com foco em ${experience} e narrativa visual forte.`,
  };
}
