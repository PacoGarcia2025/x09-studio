/** Kit visual X09 — injetado no Sandpack como /components/ui/*.tsx */

export const KIT_BUTTON = `import { DESIGN_TOKENS } from "../../design-tokens";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants = {
    primary: \`\${DESIGN_TOKENS.colors.accent} \${DESIGN_TOKENS.colors.accentText} hover:brightness-110\`,
    secondary: "border border-zinc-700 bg-transparent text-white hover:bg-white/5",
    ghost: "text-zinc-300 hover:bg-white/5",
  };
  return (
    <button
      className={\`\${base} \${sizes[size]} \${variants[variant]} \${className}\`}
      {...props}
    >
      {children}
    </button>
  );
}
`;

export const KIT_CARD = `import { DESIGN_TOKENS } from "../../design-tokens";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={\`\${DESIGN_TOKENS.colors.card} \${DESIGN_TOKENS.effects.glass} \${DESIGN_TOKENS.effects.shadow} p-6 md:p-8 \${className}\`}
    >
      {children}
    </div>
  );
}
`;

export const KIT_SECTION = `import { DESIGN_TOKENS } from "../../design-tokens";

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={\`relative px-6 py-20 md:px-10 \${className}\`}>
      <div className="mx-auto max-w-6xl">
        {(eyebrow || title || subtitle) && (
          <div className="mb-10 max-w-3xl space-y-3">
            {eyebrow ? (
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                {eyebrow}
              </p>
            ) : null}
            {title ? <h2 className={DESIGN_TOKENS.typography.h2}>{title}</h2> : null}
            {subtitle ? <p className={DESIGN_TOKENS.typography.body}>{subtitle}</p> : null}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
`;

export const KIT_NAVBAR = `import { DESIGN_TOKENS } from "../../design-tokens";
import { Button } from "./Button";

export function Navbar({
  brand,
  links = [],
  cta,
  onNavigate,
}: {
  brand: string;
  links?: Array<{ id: string; label: string }>;
  cta?: string;
  onNavigate?: (id: string) => void;
}) {
  return (
    <header className={\`sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/70 \${DESIGN_TOKENS.effects.glass}\`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate?.("home")}
          className="text-sm font-semibold tracking-tight text-white"
        >
          {brand}
        </button>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate?.(link.id)}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </nav>
        {cta ? (
          <Button size="sm" onClick={() => onNavigate?.("cta")}>
            {cta}
          </Button>
        ) : (
          <span />
        )}
      </div>
    </header>
  );
}
`;

export const KIT_FORM_FIELD = `import { DESIGN_TOKENS } from "../../design-tokens";

export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      <div className={\`\${DESIGN_TOKENS.colors.card} \${DESIGN_TOKENS.effects.glass} px-3 py-2\`}>
        {children}
      </div>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
`;

export const KIT_DATA_TABLE = `import { DESIGN_TOKENS } from "../../design-tokens";
import { EmptyState } from "./EmptyState";

export function DataTable({
  columns,
  rows,
  emptyTitle = "Nenhum registro",
  emptyDescription = "Os dados aparecerão aqui.",
}: {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, React.ReactNode>>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={\`overflow-hidden \${DESIGN_TOKENS.colors.card} \${DESIGN_TOKENS.effects.glass}\`}>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-800 text-zinc-400">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-zinc-900/80 text-zinc-200">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;

export const KIT_EMPTY_STATE = `import { DESIGN_TOKENS } from "../../design-tokens";
import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={\`flex flex-col items-center justify-center gap-3 px-6 py-16 text-center \${DESIGN_TOKENS.colors.card} \${DESIGN_TOKENS.effects.glass}\`}>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description ? <p className={DESIGN_TOKENS.typography.body}>{description}</p> : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
`;

export const KIT_APP_SHELL = `import { DESIGN_TOKENS } from "../../design-tokens";
import { Navbar } from "./Navbar";

export function AppShell({
  brand,
  links,
  cta,
  onNavigate,
  children,
}: {
  brand: string;
  links?: Array<{ id: string; label: string }>;
  cta?: string;
  onNavigate?: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={\`relative min-h-screen overflow-x-hidden antialiased \${DESIGN_TOKENS.colors.bg} \${DESIGN_TOKENS.colors.textPrimary}\`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.06),transparent)]" />
      <Navbar brand={brand} links={links} cta={cta} onNavigate={onNavigate} />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
`;

export const KIT_INDEX = `export { Button } from "./Button";
export { Card } from "./Card";
export { Section } from "./Section";
export { Navbar } from "./Navbar";
export { FormField } from "./FormField";
export { DataTable } from "./DataTable";
export { EmptyState } from "./EmptyState";
export { AppShell } from "./AppShell";
`;

export const MOCK_DATA_LIB = `/** Adapters mock — Preview nunca escreve no Supabase real. */

export type User = { id: string; email: string; name: string };

const users: User[] = [
  { id: "u1", email: "demo@x09.com.br", name: "Demo X09" },
];

let session: User | null = users[0]!;

export const auth = {
  async getSession() {
    return session;
  },
  async signIn(email: string) {
    session = users.find((u) => u.email === email) ?? {
      id: crypto.randomUUID(),
      email,
      name: email.split("@")[0] || "Usuário",
    };
    return session;
  },
  async signOut() {
    session = null;
  },
};

export function createRepository<T extends { id: string }>(seed: T[]) {
  let rows = [...seed];
  return {
    async list() {
      return [...rows];
    },
    async get(id: string) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async create(input: Omit<T, "id"> & { id?: string }) {
      const row = { ...input, id: input.id ?? crypto.randomUUID() } as T;
      rows = [row, ...rows];
      return row;
    },
    async update(id: string, patch: Partial<T>) {
      rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
      return rows.find((r) => r.id === id) ?? null;
    },
    async remove(id: string) {
      rows = rows.filter((r) => r.id !== id);
      return true;
    },
  };
}
`;

export const KIT_FILES: Record<string, string> = {
  "/components/ui/Button.tsx": KIT_BUTTON,
  "/components/ui/Card.tsx": KIT_CARD,
  "/components/ui/Section.tsx": KIT_SECTION,
  "/components/ui/Navbar.tsx": KIT_NAVBAR,
  "/components/ui/FormField.tsx": KIT_FORM_FIELD,
  "/components/ui/DataTable.tsx": KIT_DATA_TABLE,
  "/components/ui/EmptyState.tsx": KIT_EMPTY_STATE,
  "/components/ui/AppShell.tsx": KIT_APP_SHELL,
  "/components/ui/index.tsx": KIT_INDEX,
  "/lib/mock-data.ts": MOCK_DATA_LIB,
};
