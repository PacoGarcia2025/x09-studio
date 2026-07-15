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
    <div className="x09-card overflow-hidden rounded-[2rem]">
      <div className="flex items-center justify-between gap-3">
        <div className="px-5 py-4">
          <h2 className="text-lg font-medium text-white">Arquivos</h2>
          <p className="text-xs text-zinc-500">Explorer moderno, busca visual e editor integrado.</p>
        </div>
        <button
          type="button"
          onClick={loadTree}
          disabled={pending}
          className="x09-muted-button mr-5 rounded-2xl px-3 py-2 text-xs text-zinc-300"
        >
          Atualizar árvore
        </button>
      </div>

      <div className="grid min-h-[560px] border-t border-white/10 lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 bg-[#05030b]/75 p-3">
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-500">
            Buscar arquivo...
          </div>
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

        <div className="flex min-h-[560px] flex-col bg-[#080512]/80">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="text-xs text-zinc-400 truncate">
              {selectedPath ?? "Selecione um arquivo"}
              {dirty ? " •" : ""}
            </span>
            <button
              type="button"
              onClick={saveFile}
              disabled={!selectedPath || !dirty || pending}
              className="rounded-xl bg-violet-500/90 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
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
            className="min-h-[460px] w-full flex-1 resize-none bg-transparent p-5 font-mono text-xs leading-6 text-zinc-200 outline-none disabled:opacity-50"
            placeholder="Abra um arquivo na árvore à esquerda."
          />
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-3">
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
        {pending ? <p className="text-xs text-zinc-500">Processando…</p> : null}
      </div>
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
                className="py-1 text-zinc-500"
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
              className={`block w-full rounded-xl px-2 py-1.5 text-left transition ${
                selectedPath === node.path
                  ? "bg-violet-500/20 text-violet-100"
                  : "text-zinc-300 hover:bg-white/5"
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
