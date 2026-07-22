/** Ícones lucide-react permitidos nos prompts do builder (auto-reparo seguro). */
export const KNOWN_LUCIDE_ICONS = new Set([
  "Sparkles",
  "Zap",
  "Shield",
  "Rocket",
  "ArrowUpRight",
  "Play",
  "Check",
  "Globe",
  "Mail",
  "Phone",
  "MessageCircle",
  "AtSign",
  "MapPin",
  "Home",
  "Building2",
  "Users",
  "Star",
  "TrendingUp",
  "ArrowRight",
  "Building",
  "KeyRound",
  "Bath",
  "BedDouble",
  "Heart",
  "Leaf",
  "Award",
  "Truck",
  "Package",
  "ShoppingBag",
  "ShoppingCart",
  "CreditCard",
  "Clock",
  "Calendar",
  "Search",
  "Menu",
  "X",
  "ChevronRight",
  "ChevronDown",
  "ExternalLink",
  "Quote",
  "Handshake",
  "Recycle",
  "Sprout",
  "Gem",
  "Crown",
  "Flame",
  "Sun",
  "Moon",
  "Eye",
  "Lock",
  "Unlock",
  "User",
  "UserPlus",
  "Settings",
  "Bell",
  "Filter",
  "Plus",
  "Minus",
  "Info",
  "AlertCircle",
  "CheckCircle",
  "XCircle",
  "HelpCircle",
  "Loader2",
  "RefreshCw",
  "Download",
  "Upload",
  "Share2",
  "Link",
  "Image",
  "Camera",
  "Video",
  "Mic",
  "Headphones",
  "Wifi",
  "Bluetooth",
  "Battery",
  "Smartphone",
  "Laptop",
  "Monitor",
  "Printer",
  "FileText",
  "Folder",
  "Bookmark",
  "Tag",
  "Tags",
  "Gift",
  "Percent",
  "DollarSign",
  "Euro",
  "Banknote",
  "Wallet",
  "Receipt",
  "BarChart",
  "BarChart2",
  "LineChart",
  "PieChart",
  "Activity",
  "Target",
  "Compass",
  "Navigation",
  "Map",
  "Route",
  "Car",
  "Bus",
  "Train",
  "Plane",
  "Ship",
  "Anchor",
  "Warehouse",
  "Store",
  "Factory",
  "Hammer",
  "Wrench",
  "Palette",
  "Brush",
  "PenTool",
  "Scissors",
  "Coffee",
  "Utensils",
  "Wine",
  "Apple",
  "Cherry",
  "Cookie",
  "Cake",
  "Pizza",
  "Salad",
  "Beef",
  "Fish",
  "Egg",
  "Milk",
  "Wheat",
  "TreePine",
  "Trees",
  "Flower2",
  "Mountain",
  "Waves",
  "Droplets",
  "Wind",
  "Cloud",
  "CloudRain",
  "Umbrella",
  "Thermometer",
  "ShieldCheck",
  "ShieldAlert",
  "BadgeCheck",
  "Verified",
]);

export type UndeclaredJsxIdentifier = {
  file: string;
  name: string;
  line: number;
};

function collectImportBindings(content: string): Set<string> {
  const bindings = new Set<string>();

  const defaultRe = /import\s+([A-Za-z_$][\w$]*)\s+from\s+["']/g;
  let m: RegExpExecArray | null;
  while ((m = defaultRe.exec(content)) !== null) {
    bindings.add(m[1]!);
  }

  const nsRe = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+["']/g;
  while ((m = nsRe.exec(content)) !== null) {
    bindings.add(m[1]!);
  }

  const namedRe = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']/g;
  while ((m = namedRe.exec(content)) !== null) {
    for (const part of m[1]!.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const asMatch = trimmed.match(
        /(?:type\s+)?([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)/,
      );
      if (asMatch) {
        bindings.add(asMatch[2]!);
      } else {
        const name = trimmed.replace(/^type\s+/, "").trim().split(/\s+/)[0];
        if (name) bindings.add(name);
      }
    }
  }

  return bindings;
}

function collectLocalBindings(content: string): Set<string> {
  const bindings = new Set<string>();
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*[=:]/g,
    /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      bindings.add(m[1]!);
    }
  }

  return bindings;
}

function findJsxIdentifierRefs(
  content: string,
): Array<{ name: string; line: number }> {
  const refs: Array<{ name: string; line: number }> = [];
  const lines = content.split(/\r?\n/);
  const jsxTagRe = /<([A-Z][A-Za-z0-9]*)\b/g;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;

    for (const m of line.matchAll(jsxTagRe)) {
      refs.push({ name: m[1]!, line: i + 1 });
    }
    if (/<motion\b/.test(line)) {
      refs.push({ name: "motion", line: i + 1 });
    }
  }

  return refs;
}

/** Componentes JSX usados sem import ou declaração local (ex.: Shield is not defined). */
export function findUndeclaredJsxInSource(
  content: string,
  file = "file.tsx",
): UndeclaredJsxIdentifier[] {
  if (!/\.tsx$/i.test(file.replace(/\\/g, "/"))) return [];

  const inScope = new Set([
    ...collectImportBindings(content),
    ...collectLocalBindings(content),
  ]);

  const undeclared: UndeclaredJsxIdentifier[] = [];
  const seen = new Set<string>();

  for (const ref of findJsxIdentifierRefs(content)) {
    const key = `${ref.name}:${ref.line}`;
    if (seen.has(key) || inScope.has(ref.name)) continue;
    seen.add(key);
    undeclared.push({ file, name: ref.name, line: ref.line });
  }

  return undeclared;
}

function mergeNamedImport(
  content: string,
  moduleSpec: string,
  names: string[],
): string {
  const unique = [...new Set(names)].sort();
  if (unique.length === 0) return content;

  const escaped = moduleSpec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = content.match(
    new RegExp(`import\\s+(?:type\\s+)?\\{([^}]+)\\}\\s+from\\s+["']${escaped}["']`),
  );

  if (existing) {
    const current = existing[1]!
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...new Set([...current, ...unique])].sort();
    return content.replace(
      existing[0],
      `import { ${merged.join(", ")} } from "${moduleSpec}"`,
    );
  }

  const importLine = `import { ${unique.join(", ")} } from "${moduleSpec}";\n`;
  const firstImport = content.match(/^import .+$/m);
  if (firstImport) {
    const idx = content.indexOf(firstImport[0]) + firstImport[0].length;
    return `${content.slice(0, idx)}\n${importLine}${content.slice(idx)}`;
  }
  return importLine + content;
}

/**
 * Injeta imports faltantes de lucide-react e framer-motion quando o identificador
 * é conhecido e seguro (ex.: <Shield /> sem import).
 */
export function repairKnownRuntimeImportsInSource(content: string): string {
  const undeclared = findUndeclaredJsxInSource(content);
  if (undeclared.length === 0) return content;

  const lucideIcons = [
    ...new Set(
      undeclared
        .map((u) => u.name)
        .filter((name) => KNOWN_LUCIDE_ICONS.has(name)),
    ),
  ];
  const needsMotion = undeclared.some((u) => u.name === "motion");

  let next = content;
  if (lucideIcons.length > 0) {
    next = mergeNamedImport(next, "lucide-react", lucideIcons);
  }
  if (needsMotion) {
    next = mergeNamedImport(next, "framer-motion", ["motion"]);
  }
  return next;
}

export function formatUndeclaredJsxMessage(
  list: UndeclaredJsxIdentifier[],
): string {
  if (list.length === 0) return "";
  const first = list[0]!;
  const extra =
    list.length > 1 ? ` (+${list.length - 1} componente(s) sem import)` : "";
  return `Componente "${first.name}" usado sem import em ${first.file}:${first.line}${extra}`;
}
