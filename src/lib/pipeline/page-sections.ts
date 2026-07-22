/** Conta blocos de layout semânticos (IA nem sempre usa <section>). */
export function countPageSections(source: string): number {
  return (
    source.match(/<(?:section|main|header|footer|article|nav)\b/gi) ?? []
  ).length;
}

/** Barra de seções — aceita páginas densas com divs quando o conteúdo é longo. */
export function meetsPremiumSectionBar(
  source: string,
  minSections = 4,
): boolean {
  const count = countPageSections(source);
  if (count >= minSections) return true;
  if (count >= 2 && source.length >= 3_500) return true;
  if (count >= 1 && source.length >= 4_000) return true;
  return false;
}
