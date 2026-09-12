import { describe, expect, it } from "vitest";
import {
  countPageSections,
  meetsPremiumSectionBar,
} from "@/lib/pipeline/page-sections";
import { evaluateVisualExperience } from "@/lib/pipeline/visual-intelligence";

describe("page-sections", () => {
  it("conta header/main/footer", () => {
    const html = "<header/><main/><footer/><div/>";
    expect(countPageSections(html)).toBe(3);
  });

  it("aceita página densa com poucos blocos semânticos", () => {
    const dense = `<main>${"x".repeat(4000)}</main>`;
    expect(meetsPremiumSectionBar(dense, 4)).toBe(true);
  });

  it("diferencia funcional de profissional e wow por direção visual", () => {
    const functional = `<main><h1>Bem vindo</h1><button>Comprar</button></main>`;
    const professional = `
      <main>
        <section><h1>Vendas premium</h1></section>
        <section><div className="grid"><div>garantia</div></div></section>
        <button>Agendar</button>
      </main>
    `;
    const wow = `
      <main>
        <section className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-500/20">
          <motion.div className="backdrop-blur-xl">
            <h1 className="text-6xl font-bold">Residências exclusivas</h1>
          </motion.div>
        </section>
        <section>storytelling</section>
        <button>Agendar visita</button>
      </main>
    `;

    expect(evaluateVisualExperience(functional, "site imobiliário premium").verdict).toBe("FAIL");
    expect(evaluateVisualExperience(professional, "site imobiliário premium").verdict).toBe("IMPROVE");
    expect(evaluateVisualExperience(wow, "site imobiliário premium").verdict).toBe("PASS");
  });
});
