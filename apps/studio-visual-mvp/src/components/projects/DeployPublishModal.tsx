import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  applyPublishPlan,
  buildPublishPlan,
  validatePublishPlan,
} from "@/lib/publish";
import { useProjectStore } from "@/store/project-store";
import { useStudioStore } from "@/store/studio-store";

export function DeployPublishModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const files = useStudioStore((s) => s.files);
  const projectId =
    useProjectStore((s) => s.currentProjectId) ??
    "00000000-0000-0000-0000-000000000001";
  const [confirmDestructive, setConfirmDestructive] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const plan = useMemo(
    () => buildPublishPlan(projectId, files),
    [projectId, files],
  );

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const gate = validatePublishPlan(plan);
    if (!gate.ok && !confirmDestructive) {
      setResult(gate.error);
      return;
    }
    const applied = await applyPublishPlan(plan, { confirmDestructive });
    setResult(
      applied.ok
        ? `Plano aprovado (${applied.mode}): ${applied.applied.join(", ") || "sem migrations"}`
        : applied.error,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-glow"
      >
        <div>
          <h3 className="text-lg font-semibold text-primary">Deploy / Publish</h3>
          <p className="mt-1 text-sm text-secondary">
            Preview usa mocks. Publish aplica migrations no Supabase real após
            confirmação.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-3 text-sm text-secondary">
          <p>Auth: {plan.authRequired ? "sim" : "não"}</p>
          <p>Migrations: {plan.migrations.length}</p>
          {plan.migrations.map((m) => (
            <p key={m.path} className="truncate">
              {m.destructive ? "⚠ " : "• "}
              {m.path}
            </p>
          ))}
          {plan.warnings.map((w) => (
            <p key={w} className="text-amber-400">
              {w}
            </p>
          ))}
        </div>

        {plan.migrations.some((m) => m.destructive) ? (
          <label className="flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={confirmDestructive}
              onChange={(e) => setConfirmDestructive(e.target.checked)}
            />
            Confirmo migrations destrutivas
          </label>
        ) : null}

        {result ? <p className="text-sm text-primary">{result}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button type="submit">Aprovar plano</Button>
        </div>
      </form>
    </div>
  );
}
