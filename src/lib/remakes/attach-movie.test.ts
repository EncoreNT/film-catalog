import { describe, expect, it, vi } from "vitest";
import {
  attachMovieToRemakeGroup,
  detachMovieFromRemakeGroup,
  updateMovieRemakeRole,
} from "@/lib/remakes/attach-movie-to-remake-group";

function createTxMock() {
  const tx = {
    remakeGroup: {
      create: vi.fn().mockResolvedValue({ id: 99 }),
      findUnique: vi.fn().mockResolvedValue({ id: 5 }),
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    remakeMember: {
      upsert: vi.fn().mockResolvedValue(undefined),
      findUnique: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return tx;
}

describe("attachMovieToRemakeGroup", () => {
  it("creates a new group by name and attaches movie", async () => {
    const tx = createTxMock();
    const db = {
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    await attachMovieToRemakeGroup(
      42,
      { name: "Виновный", role: "ORIGINAL" },
      db as never,
    );

    expect(tx.remakeGroup.create).toHaveBeenCalled();
    expect(tx.remakeMember.upsert).toHaveBeenCalledWith({
      where: { groupId_movieId: { groupId: 99, movieId: 42 } },
      create: { groupId: 99, movieId: 42, role: "ORIGINAL" },
      update: { role: "ORIGINAL" },
    });
  });

  it("attaches to existing group by id", async () => {
    const tx = createTxMock();
    const db = {
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    await attachMovieToRemakeGroup(
      42,
      { groupId: 5, role: "REMAKE" },
      db as never,
    );

    expect(tx.remakeGroup.create).not.toHaveBeenCalled();
    expect(tx.remakeGroup.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: { id: true },
    });
  });
});

describe("updateMovieRemakeRole", () => {
  it("updates role for existing membership", async () => {
    const tx = createTxMock();
    const db = {
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    await updateMovieRemakeRole(42, 5, "REIMAGINING", db as never);

    expect(tx.remakeMember.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { role: "REIMAGINING" },
    });
  });
});

describe("detachMovieFromRemakeGroup", () => {
  it("removes membership and deletes empty group", async () => {
    const tx = createTxMock();
    tx.remakeMember.count.mockResolvedValue(0);
    const db = {
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    await detachMovieFromRemakeGroup(42, 5, db as never);

    expect(tx.remakeMember.deleteMany).toHaveBeenCalledWith({
      where: { groupId: 5, movieId: 42 },
    });
    expect(tx.remakeGroup.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });
});
