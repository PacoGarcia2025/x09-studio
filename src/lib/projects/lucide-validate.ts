import { LUCIDE_ICON_SET } from "@/lib/projects/lucide-icons.generated";

export type InvalidLucideImport = {
  file: string;
  name: string;
  line: number;
  replacement: string;
};

/**
 * Nomes inventados pela IA que não existem em lucide-react.
 * Mapeados para ícones válidos semanticamente equivalentes.
 */
export const LUCIDE_ICON_ALIASES: Record<string, string> = {
  CurrencyDollar: "DollarSign",
  Currency: "DollarSign",
  Money: "Banknote",
  Cash: "Banknote",
  BuildingStore: "Store",
  Shop: "Store",
  Storefront: "Store",
  WhatsApp: "MessageCircle",
  Instagram: "AtSign",
  Facebook: "Users",
  Twitter: "AtSign",
  Linkedin: "Users",
  Youtube: "Play",
  TikTok: "Music",
  Tiktok: "Music",
  Location: "MapPin",
  LocationPin: "MapPin",
  Pin: "MapPin",
  Email: "Mail",
  Envelope: "Mail",
  Telephone: "Phone",
  Call: "Phone",
  House: "Home",
  Bed: "BedDouble",
  Bedroom: "BedDouble",
  Bathroom: "Bath",
  Shower: "Bath",
  Parking: "Car",
  Garage: "Car",
  Area: "Maximize2",
  SquareMeters: "Maximize2",
  Ruler: "Ruler",
  CalendarDay: "CalendarDays",
  Date: "CalendarDays",
  Chart: "BarChart2",
  Graph: "LineChart",
  Analytics: "TrendingUp",
  Security: "Shield",
  Safe: "ShieldCheck",
  Verified: "BadgeCheck",
  Checkmark: "Check",
  Close: "X",
  MenuIcon: "Menu",
  SearchIcon: "Search",
  UserIcon: "User",
  SettingsIcon: "Settings",
  HeartIcon: "Heart",
  StarIcon: "Star",
  Arrow: "ArrowRight",
  Chevron: "ChevronRight",
  External: "ExternalLink",
  LinkIcon: "Link",
  ImageIcon: "Image",
  Photo: "Image",
  CameraIcon: "Camera",
  VideoIcon: "Video",
  DownloadIcon: "Download",
  UploadIcon: "Upload",
  Trash: "Trash2",
  Delete: "Trash2",
  Edit: "Pencil",
  PencilIcon: "Pencil",
  PlusIcon: "Plus",
  MinusIcon: "Minus",
  InfoIcon: "Info",
  Warning: "AlertTriangle",
  Error: "AlertCircle",
  Success: "CheckCircle",
  Loading: "Loader2",
  Spinner: "Loader2",
};

export function isValidLucideIcon(name: string): boolean {
  return LUCIDE_ICON_SET.has(name);
}

function suggestLucideReplacement(invalid: string): string | null {
  if (LUCIDE_ICON_ALIASES[invalid]) {
    const alias = LUCIDE_ICON_ALIASES[invalid]!;
    return isValidLucideIcon(alias) ? alias : null;
  }

  for (const valid of LUCIDE_ICON_SET) {
    if (valid.toLowerCase() === invalid.toLowerCase()) return valid;
  }

  const lower = invalid.toLowerCase();
  for (const valid of LUCIDE_ICON_SET) {
    if (valid.toLowerCase().includes(lower) || lower.includes(valid.toLowerCase())) {
      return valid;
    }
  }

  return null;
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

/** Extrai nomes importados de lucide-react em um arquivo TSX/TS. */
export function extractLucideImportNames(content: string): Array<{
  name: string;
  index: number;
}> {
  const results: Array<{ name: string; index: number }> = [];
  const importRe =
    /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']lucide-react["']/g;
  let m: RegExpExecArray | null;

  while ((m = importRe.exec(content)) !== null) {
    const blockStart = m.index;
    for (const part of m[1]!.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const asMatch = trimmed.match(
        /(?:type\s+)?([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)/,
      );
      const name = asMatch ? asMatch[2]! : trimmed.replace(/^type\s+/, "").trim().split(/\s+/)[0];
      if (name) {
        results.push({ name, index: blockStart });
      }
    }
  }

  return results;
}

export function findInvalidLucideImportsInSource(
  content: string,
  file = "file.tsx",
): InvalidLucideImport[] {
  const invalid: InvalidLucideImport[] = [];
  const seen = new Set<string>();

  for (const { name, index } of extractLucideImportNames(content)) {
    if (isValidLucideIcon(name) || seen.has(name)) continue;
    seen.add(name);
    const replacement = suggestLucideReplacement(name);
    invalid.push({
      file,
      name,
      line: lineOf(content, index),
      replacement: replacement ?? name,
    });
  }

  return invalid;
}

export function findUnrepairableLucideImportsInSource(
  content: string,
  file = "file.tsx",
): InvalidLucideImport[] {
  return findInvalidLucideImportsInSource(content, file).filter(
    (item) => !isValidLucideIcon(item.replacement),
  );
}

/** Substitui ícones lucide inválidos no import e no JSX/uso no arquivo. */
export function repairInvalidLucideImportsInSource(content: string): string {
  const invalid = findInvalidLucideImportsInSource(content).filter(
    (item) => isValidLucideIcon(item.replacement) && item.replacement !== item.name,
  );
  if (invalid.length === 0) return content;

  let next = content;
  for (const item of invalid) {
    const reImport = new RegExp(`\\b${item.name}\\b`, "g");
    next = next.replace(reImport, item.replacement);
  }

  return next;
}

export function formatInvalidLucideMessage(
  list: InvalidLucideImport[],
): string {
  if (list.length === 0) return "";
  const first = list[0]!;
  const extra =
    list.length > 1 ? ` (+${list.length - 1} ícone(s) inválido(s))` : "";
  return `Ícone lucide inválido "${first.name}" em ${first.file}:${first.line} — use "${first.replacement}"${extra}`;
}
