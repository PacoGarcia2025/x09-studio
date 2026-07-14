"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useProjects } from "@/contexts/ProjectContext";

export default function NewProjectDialog() {
  const { createProject } = useProjects();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function handleCreate() {
    if (!name.trim()) return;

    createProject(name);

    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-violet-600 hover:bg-violet-700">
          ➕ Novo Projeto
        </Button>
      </DialogTrigger>

      <DialogContent>

        <DialogHeader>

          <DialogTitle>
            Novo Projeto
          </DialogTitle>

          <DialogDescription>
            Informe o nome do projeto.
          </DialogDescription>

        </DialogHeader>

        <Input
          placeholder="Ex.: Sistema Contábil"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleCreate}
          >
            Criar Projeto
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}