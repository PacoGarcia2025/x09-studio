import Link from "next/link";
import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";
import { X09Robot } from "@/components/brand/X09Robot";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

/** Login / signup — cosmos da landing, robô grande sem sobrepor o card. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="x09-landing relative min-h-dvh overflow-x-hidden overflow-y-auto p-4 text-zinc-100 sm:p-6">
      <StudioAtmosphere />

      <Link
        href="/"
        className="absolute left-4 top-4 z-20 text-xs font-medium text-zinc-500 transition hover:text-violet-200 sm:left-6 sm:top-6"
      >
        ← Voltar
      </Link>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col items-center justify-center gap-10 py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-8">
        <div className="flex w-full max-w-md flex-col items-center gap-5 lg:max-w-lg lg:flex-1 lg:items-center">
          <div className="x09-auth-robot">
            <X09Robot />
          </div>
          <p className="max-w-xs text-center text-sm leading-6 text-zinc-500">
            Pipeline Plan → Build → Verify → Fix → Preview → Deploy
          </p>
        </div>

        <div className="x09-card x09-fade-in w-full max-w-[420px] shrink-0 rounded-[2rem] p-8 lg:relative lg:z-10">
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
    </main>
  );
}
