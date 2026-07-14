"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

export default function NewProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full bg-violet-600 hover:bg-violet-700">
          ➕ Novo Projeto
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>

          <DialogDescription>
            Crie um novo projeto para começar o desenvolvimento.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}