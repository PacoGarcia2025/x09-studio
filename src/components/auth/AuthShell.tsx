import Link from "next/link";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { X09Robot } from "@/components/brand/X09Robot";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

/** Login / signup no mesmo visual cosmos da landing. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="x09-landing relative grid min-h-screen place-items-center overflow-hidden p-6 text-zinc-100">
      <StudioAtmosphere />
      <div className="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_400px]">
        <div className="hidden flex-col items-center justify-center gap-6 lg:flex">
          <X09Robot compact />
          <p className="max-w-xs text-center text-sm leading-6 text-zinc-500">
            Pipeline Plan → Build → Verify → Fix → Preview → Deploy
          </p>
        </div>
        <div className="x09-card x09-fade-in rounded-[2rem] p-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
              X09 Studio
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="text-sm leading-6 text-zinc-400">{subtitle}</p>
          </div>
          {children}
          <div className="mt-6 text-sm text-zinc-500">{footer}</div>
        </div>
      </div>
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 text-xs font-medium text-zinc-500 transition hover:text-violet-200"
      >
        ← Voltar
      </Link>
    </main>
  );
}
