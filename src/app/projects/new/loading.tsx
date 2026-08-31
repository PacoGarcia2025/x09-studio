import { StudioAtmosphere } from "@/components/brand/StudioAtmosphere";

export default function NewProjectLoading() {
  return (
    <div className="x09-landing relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <StudioAtmosphere />
      <div className="x09-card relative z-10 w-full max-w-md rounded-[28px] p-8 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-300" />
        <h1 className="text-lg font-semibold text-white">
          Preparando seu projeto…
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          A IA já está entendendo o prompt. Em seguida você entra no preview com
          o chat na lateral.
        </p>
      </div>
    </div>
  );
}
