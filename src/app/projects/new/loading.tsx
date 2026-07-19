export default function NewProjectLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6">
      <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        <h1 className="text-lg font-semibold text-zinc-900">
          Preparando seu projeto…
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          A IA já está entendendo o prompt. Em seguida você entra no preview com
          o chat na lateral.
        </p>
      </div>
    </div>
  );
}
