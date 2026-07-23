import { describe, expect, it } from "vitest";
import {
  findInvalidLucideImportsInSource,
  repairInvalidLucideImportsInSource,
} from "@/lib/projects/lucide-validate";

describe("lucide-validate", () => {
  it("detecta CurrencyDollar como inválido", () => {
    const source = `import { CalendarDays, BuildingStore, CurrencyDollar } from "lucide-react";

export default function Page() {
  return <CurrencyDollar size={20} />;
}
`;
    const invalid = findInvalidLucideImportsInSource(
      source,
      "src/pages/PropertyDetailPage.tsx",
    );
    expect(invalid.map((i) => i.name)).toEqual(
      expect.arrayContaining(["CurrencyDollar", "BuildingStore"]),
    );
  });

  it("repara CurrencyDollar e BuildingStore no import e JSX", () => {
    const source = `import { CalendarDays, BuildingStore, Home, Car, BedDouble, MapPin, CurrencyDollar } from "lucide-react";
import { motion } from "framer-motion";

export default function Page() {
  return (
    <>
      <CurrencyDollar className="w-5" />
      <BuildingStore className="w-5" />
    </>
  );
}
`;
    const repaired = repairInvalidLucideImportsInSource(source);
    expect(repaired).toContain("DollarSign");
    expect(repaired).toContain("Store");
    expect(repaired).not.toContain("CurrencyDollar");
    expect(repaired).not.toContain("BuildingStore");
    expect(repaired).toContain("CalendarDays");
  });
});
