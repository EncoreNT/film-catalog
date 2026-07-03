"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import { FranchiseCard } from "@/components/franchises/FranchiseCard";
import { EmptyFranchises } from "@/components/franchises/EmptyFranchises";
import { FranchiseForm } from "@/components/franchises/FranchiseForm";
import { Modal } from "@/components/primitives/Modal";
import { Button } from "@/components/primitives/Button";

interface FranchisesListClientProps {
  franchises: FranchiseWithSlots[];
}

export function FranchisesListClient({
  franchises,
}: FranchisesListClientProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Франшизы
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Собирайте серии фильмов и отслеживайте, чего не хватает во франшизе.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Создать
        </Button>
      </header>

      {franchises.length === 0 ? (
        <EmptyFranchises onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {franchises.map((franchise, index) => (
            <FranchiseCard
              key={franchise.id}
              franchise={franchise}
              index={index}
            />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новая франшиза"
        size="xwide"
      >
        <FranchiseForm
          mode="create"
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}
