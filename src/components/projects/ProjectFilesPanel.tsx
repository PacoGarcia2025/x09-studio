"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  getProjectFileTree,
  readFileAction,
  writeFileAction,
} from "@/lib/projects/files.actions";
import type { FileTreeNode } from "@/lib/projects/file-tree";

type Props = {
  projectId: string;
};

export function ProjectFilesPanel({ projectId }: Props) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadTree = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const result = await getProjectFileTree(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTree(result.data);
    });
  }, [projectId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  function openFile(filePath: string) {
    startTransition(async () => {
      setError(null);
      setStatus(null);
      const result = await readFileAction(projectId, filePath);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelectedPath(result.data.path);
      setContent(result.data.content);
      setDirty(false);
    });
  }

  function saveFile() {
    if (!selectedPath) return;
    startTransition(async () => {
      setError(null);
      setStatus(null);
      const result = await writeFileAction(projectId, selectedPath, content);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDirty(false);
      setStatus(`Salvo: ${result.data.path}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Arquivos</h2>
        <button
          type="button"
          onClick={loadTree}
          disabled={pending}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Atualizar árvore
        </button>
      </div>
      <p className="text-sm text-zinc-500">
        Scaffold do template React + Supabase em disco (
        <code className="text-zinc-400">STUDIO_PROJECTS_ROOT</code>).
      </p>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr] min-h-[420px]">
        <aside className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-3 overflow-auto max-h-[560px]">
          {tree.length === 0 && !pending ? (
            <p className="text-xs text-zinc-500">Nenhum arquivo.</p>
          ) : (
            <FileTree
              nodes={tree}
              selectedPath={selectedPath}
              onOpenFile={openFile}
            />
          )}
        </aside>

        <div className="flex flex-col rounded-lg border border-zinc-900 bg-zinc-950/40 min-h-[420px]">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-900 px-3 py-2">
            <span className="text-xs text-zinc-400 truncate">
              {selectedPath ?? "Selecione um arquivo"}
              {dirty ? " •" : ""}
            </span>
            <button
              type="button"
              onClick={saveFile}
              disabled={!selectedPath || !dirty || pending}
              className="rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
              setStatus(null);
            }}
            disabled={!selectedPath || pending}
            spellCheck={false}
            className="flex-1 w-full resize-none bg-transparent p-3 font-mono text-xs text-zinc-200 outline-none disabled:opacity-50 min-h-[360px]"
            placeholder="Abra um arquivo na árvore à esquerda."
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
      {pending ? <p className="text-xs text-zinc-500">Processando…</p> : null}
    </div>
  );
}

function FileTree({
  nodes,
  selectedPath,
  onOpenFile,
  depth = 0,
}: {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onOpenFile: (path: string) => void;
  depth?: number;
}) {
  return (
    <ul className="space-y-0.5 text-xs">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.type === "directory" ? (
            <div>
              <div
                className="text-zinc-500 py-0.5"
                style={{ paddingLeft: depth * 12 }}
              >
                {node.name}/
              </div>
              {node.children ? (
                <FileTree
                  nodes={node.children}
                  selectedPath={selectedPath}
                  onOpenFile={onOpenFile}
                  depth={depth + 1}
                />
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenFile(node.path)}
              className={`block w-full text-left py-0.5 rounded px-1 ${
                selectedPath === node.path
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-300 hover:bg-zinc-900"
              }`}
              style={{ paddingLeft: depth * 12 }}
            >
              {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
