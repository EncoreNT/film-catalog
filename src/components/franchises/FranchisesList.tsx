"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import { FranchiseCard } from "@/components/franchises/FranchiseCard";
import { EmptyFranchises } from "@/components/franchises/EmptyFranchises";
import { FranchiseForm } from "@/components/franchises/FranchiseForm";
import { Modal } from "@/components/primitives/Modal";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Button } from "@/components/primitives/Button";

interface FranchisesListProps {
  franchises: FranchiseWithSlots[];
}

export function FranchisesList({ franchises }: FranchisesListProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Франшизы"
        titleClassName="font-display text-4xl font-bold tracking-tight sm:text-5xl"
        subtitle="Собирайте серии фильмов и отслеживайте, чего не хватает во франшизе."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Создать
          </Button>
        }
      />

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
