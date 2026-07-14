"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AiChat() {
  const [prompt, setPrompt] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setLoading(true);
    setLogs(["🧠 Enviando solicitação para a IA..."]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setLogs([
          "❌ Erro ao comunicar com a IA.",
          data.error ?? "",
        ]);
        return;
      }

      setLogs([data.text]);
    } catch (error) {
      console.error(error);

      setLogs([
        "❌ Erro inesperado ao chamar a IA.",
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">
          AI Builder
        </h2>

        <p className="text-zinc-400 mt-2">
          Descreva o sistema que deseja construir.
        </p>
      </div>

      <Textarea
        rows={8}
        placeholder="Ex.: Crie um sistema completo para uma oficina mecânica..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-violet-600 hover:bg-violet-700"
      >
        {loading ? "⏳ Gerando..." : "🚀 Gerar Projeto"}
      </Button>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="font-semibold text-white mb-4">
          Execução
        </h3>

        {logs.length === 0 ? (
          <p className="text-zinc-500">
            Aguardando comando...
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log, index) => (
              <pre
                key={index}
                className="whitespace-pre-wrap text-zinc-300 text-sm"
              >
                {log}
              </pre>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}