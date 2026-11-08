"use client";

import { useCallback, useRef, useState } from "react";
import { GitFork, Loader2, Plus, X } from "lucide-react";
import { Modal } from "@/components/primitives/Modal";
import { CreatableCombobox } from "@/components/primitives/CreatableCombobox";
import { InfoHint } from "@/components/primitives/InfoHint";
import { RemakeRoleSelect } from "@/components/remakes/RemakeRoleSelect";
import type { MovieRemakeMembership } from "@/lib/remakes/remake-membership";
import type { RemakeRole } from "@/generated/prisma/client";
import { searchTextEquals } from "@/lib/shared/search-text";
import { apiFetch } from "@/lib/api/client";
import { useDebouncedApiSearch } from "@/hooks/useDebouncedApiSearch";

interface MovieRemakePickerProps {
  movieId: number;
  initialMemberships: MovieRemakeMembership[];
  embedded?: boolean;
}

interface RemakeGroupLite {
  id: number;
  name: string;
  slug: string;
}

const SEARCH_LIMIT = 20;
const DEFAULT_ROLE: RemakeRole = "REMAKE";

export function MovieRemakePicker({
  movieId,
  initialMemberships,
  embedded = false,
}: MovieRemakePickerProps) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [open, setOpen] = useState(false);
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
  const [pendingGroup, setPendingGroup] = useState<{
    id?: number;
    name: string;
  } | null>(null);
  const [pendingRole, setPendingRole] = useState<RemakeRole>(DEFAULT_ROLE);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const buildUrl = useCallback(
    (q: string) =>
      `/api/remake-groups?lite=1&limit=${SEARCH_LIMIT}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    [],
  );

  const {
    query,
    setQuery,
    results,
    loading: searching,
    onQueryChange,
    runSearch,
  } = useDebouncedApiSearch<RemakeGroupLite>({
    buildUrl,
    enabled: open,
    debounceMs: 220,
  });

  const busy =
    creatingName != null || removingId != null || updatingRoleId != null;
  const joinedIds = new Set(memberships.map((m) => m.groupId));

  const openDropdown = useCallback(() => {
    setOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    void runSearch("");
  }, [runSearch, setQuery]);

  const attachToGroup = async (payload: {
    groupId?: number;
    name?: string;
    role: RemakeRole;
  }) => {
    setError(null);
    try {
      const data = await apiFetch<MovieRemakeMembership[]>(
        `/api/movies/${movieId}/remakes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Не удалось добавить в группу",
      );
      setMemberships(data);
      setPendingGroup(null);
      closeDropdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const pickGroup = (group: RemakeGroupLite) => {
    setPendingRole(DEFAULT_ROLE);
    setPendingGroup({ id: group.id, name: group.name });
    closeDropdown();
  };

  const createGroup = async (name: string) => {
    setCreatingName(name);
    setPendingGroup({ name });
    setPendingRole(DEFAULT_ROLE);
    closeDropdown();
    setCreatingName(null);
  };

  const confirmAttach = async () => {
    if (!pendingGroup) return;
    setCreatingName(pendingGroup.name);
    await attachToGroup({
      groupId: pendingGroup.id,
      name: pendingGroup.id ? undefined : pendingGroup.name,
      role: pendingRole,
    });
    setCreatingName(null);
  };

  const updateRole = async (groupId: number, role: RemakeRole) => {
    setError(null);
    setUpdatingRoleId(groupId);
    try {
      const data = await apiFetch<MovieRemakeMembership[]>(
        `/api/movies/${movieId}/remakes/${groupId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
        "Не удалось обновить роль",
      );
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const removeGroup = async (groupId: number) => {
    setRemovingId(groupId);
    setError(null);
    try {
      const data = await apiFetch<MovieRemakeMembership[]>(
        `/api/movies/${movieId}/remakes/${groupId}`,
        { method: "DELETE" },
        "Не удалось удалить",
      );
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setRemovingId(null);
    }
  };

  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 &&
    !results.some((r) => searchTextEquals(r.name, trimmedQuery));

  return (
    <div className="flex flex-col gap-2">
      {!embedded ? (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted">Ремейки</span>
          <InfoHint
            label="Ремейки"
            text="Объедините фильм с другими версиями одного произведения: оригинал, ремейк, переосмысление. Новую группу можно создать прямо отсюда."
          />
        </div>
      ) : null}

      <div
        className={
          embedded
            ? "space-y-3"
            : "rounded-[var(--radius)] border border-border bg-bg-elevated p-3"
        }
      >
        {memberships.length > 0 ? (
          <ul className="space-y-1.5">
            {memberships.map((m) => {
              const removing = removingId === m.groupId;
              return (
                <li
                  key={m.groupId}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-surface px-3 py-2 transition-colors hover:border-border-strong"
                >
                  <GitFork
                    className="h-4 w-4 shrink-0 text-neural/70"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {m.groupName}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <RemakeRoleSelect
                        value={m.role}
                        onChange={(role) => updateRole(m.groupId, role)}
                        disabled={busy}
                      />
                    </div>
                    {m.coMembers.length > 0 ? (
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        {m.coMembers
                          .map(
                            (member) =>
                              `${member.movieTitle}${member.movieYear ? ` (${member.movieYear})` : ""}`,
                          )
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGroup(m.groupId)}
                    disabled={busy}
                    aria-label={`Убрать из группы «${m.groupName}»`}
                    className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {removing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <X className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-1 py-2 text-sm text-muted">
            Не входит ни в одну группу ремейков
          </p>
        )}

        {pendingGroup ? (
          <div className="mt-2 space-y-3 rounded-[var(--radius-sm)] border border-neural/30 bg-neural/5 p-3">
            <p className="text-sm text-text">
              Добавить в группу «{pendingGroup.name}»
            </p>
            <RemakeRoleSelect
              value={pendingRole}
              onChange={setPendingRole}
              disabled={busy}
              compact={false}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmAttach}
                disabled={busy}
                className="focus-ring cursor-pointer rounded-[var(--radius-sm)] border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creatingName ? (
                  <Loader2
                    className="inline h-4 w-4 animate-spin"
                    aria-hidden
                  />
                ) : (
                  "Добавить"
                )}
              </button>
              <button
                type="button"
                onClick={() => setPendingGroup(null)}
                disabled={busy}
                className="focus-ring cursor-pointer rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div className="relative mt-2">
            <button
              type="button"
              onClick={openDropdown}
              aria-haspopup="dialog"

              className={`focus-ring flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 text-sm transition-all duration-200 ${
                open
                  ? "border-neural/50 bg-bg-surface shadow-[0_0_16px_rgba(139,92,246,0.25)]"
                  : "border-border bg-bg-surface text-muted hover:border-border-strong hover:text-text"
              }`}
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-neural/80" aria-hidden />
                Добавить в группу ремейков
              </span>
            </button>

            {open ? (
              <Modal
                open={open}
                onClose={closeDropdown}
                preventCancel={busy}
                title="Добавить в группу ремейков"
                bodyClassName="relation-picker-body"
              >
                <CreatableCombobox
                  open
                  query={query}
                  onQueryChange={onQueryChange}
                  loading={searching}
                  disabled={busy}
                  items={results
                    .filter((r) => !joinedIds.has(r.id))
                    .map((r) => ({
                      id: r.id,
                      label: r.name,
                    }))}
                  onSelect={(item) => {
                    const group = results.find((r) => r.id === item.id);
                    if (group) pickGroup(group);
                  }}
                  canCreate={canCreate}
                  creating={creatingName === trimmedQuery}
                  onCreate={createGroup}
                  emptyMessage={
                    trimmedQuery ? "Ничего не найдено" : "Нет доступных групп"
                  }
                  itemIcon={
                    <GitFork
                      className="h-4 w-4 shrink-0 text-neural/70"
                      aria-hidden
                    />
                  }
                  createIcon={<Plus className="h-4 w-4 shrink-0" aria-hidden />}
                  inputRef={inputRef}
                  className="relation-picker-results"
                  searchInputClassName="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-surface py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-muted/60"
                />
                {error && (
                  <p role="alert" className="mt-3 text-sm text-danger">
                    {error}
                  </p>
                )}
              </Modal>
            ) : null}
          </div>
        )}
      </div>

      {error && !open ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
