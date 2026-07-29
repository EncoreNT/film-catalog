import { describe, expect, it, vi } from "vitest";
import { syncRemakeMembers } from "@/lib/remakes/remake-members";
import { cleanupEmptyRemakeGroup } from "@/lib/remakes/remake-cleanup";

describe("syncRemakeMembers", () => {
  it("replaces all members in a group", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const createMany = vi.fn().mockResolvedValue({ count: 2 });

    await syncRemakeMembers(
      {
        remakeMember: { deleteMany, createMany },
      } as never,
      10,
      [
        { movieId: 1, role: "ORIGINAL" },
        { movieId: 2, role: "REMAKE" },
      ],
    );

    expect(deleteMany).toHaveBeenCalledWith({ where: { groupId: 10 } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { groupId: 10, movieId: 1, role: "ORIGINAL" },
        { groupId: 10, movieId: 2, role: "REMAKE" },
      ],
    });
  });

  it("skips createMany when members list is empty", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const createMany = vi.fn();

    await syncRemakeMembers(
      {
        remakeMember: { deleteMany, createMany },
      } as never,
      10,
      [],
    );

    expect(deleteMany).toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});

describe("cleanupEmptyRemakeGroup", () => {
  it("deletes group when no members remain", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const deleteFn = vi.fn().mockResolvedValue(undefined);

    await cleanupEmptyRemakeGroup(
      {
        remakeMember: { count },
        remakeGroup: { delete: deleteFn },
      } as never,
      7,
    );

    expect(count).toHaveBeenCalledWith({ where: { groupId: 7 } });
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it("keeps group when members remain", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const deleteFn = vi.fn();

    await cleanupEmptyRemakeGroup(
      {
        remakeMember: { count },
        remakeGroup: { delete: deleteFn },
      } as never,
      7,
    );

    expect(deleteFn).not.toHaveBeenCalled();
  });
});
