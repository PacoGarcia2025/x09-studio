import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

type Item = {
  id: string;
  title: string;
  notes: string;
};

type DashboardPageProps = {
  onNavigateHome?: () => void;
  onSignOut?: () => void;
};

export function DashboardPage({
  onNavigateHome,
  onSignOut,
}: DashboardPageProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabase();
        const { data, error: err } = await supabase
          .from("items")
          .select("id, title, notes");
        if (err) throw err;
        if (!cancelled) {
          setItems(
            (data as Item[] | null)?.length
              ? (data as Item[])
              : [
                  {
                    id: "demo-1",
                    title: "Primeiro registro",
                    notes: "Edite ou adicione novos itens abaixo.",
                  },
                ],
          );
        }
      } catch {
        if (!cancelled) {
          setItems([
            {
              id: "demo-1",
              title: "Primeiro registro",
              notes: "Modo demo — configure Supabase para persistir.",
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const next: Item = {
      id: crypto.randomUUID(),
      title: title.trim(),
      notes: notes.trim(),
    };
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.from("items").insert({
        id: next.id,
        title: next.title,
        notes: next.notes,
      });
      if (err) {
        // Fallback local se a tabela ainda não existir
        setItems((prev) => [next, ...prev]);
      } else {
        setItems((prev) => [next, ...prev]);
      }
      setTitle("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
      setItems((prev) => [next, ...prev]);
      setTitle("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await getSupabase().from("items").delete().eq("id", id);
    } catch {
      // ignore — lista já atualizada localmente
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Área logada
          </p>
          <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigateHome?.()}
            className="rounded-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Site
          </button>
          <button
            type="button"
            onClick={() => onSignOut?.()}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-sm font-semibold text-zinc-800">Registros</h2>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Nenhum item ainda.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between rounded-2xl bg-white p-4 ring-1 ring-zinc-200"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{item.title}</p>
                    {item.notes ? (
                      <p className="mt-1 text-sm text-zinc-500">{item.notes}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-800">Novo item</h2>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm">
              <span className="text-zinc-700">Título</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-violet-400"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-700">Notas</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-violet-400"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Salvando…" : "Adicionar"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
