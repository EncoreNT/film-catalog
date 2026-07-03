import { describe, expect, it, vi, beforeEach } from "vitest";
import { MovieStatus } from "@/generated/prisma/client";
import { approveMovie } from "@/lib/movies/approve-movie";

const updateMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    movie: {
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

describe("approveMovie", () => {
  beforeEach(() => {
    updateMock.mockReset();
  });

  it("sets status to CATALOG and includes movie relations", async () => {
    const movie = { id: 42, status: MovieStatus.CATALOG, title: "Test" };
    updateMock.mockResolvedValue(movie);

    const result = await approveMovie(42);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { status: MovieStatus.CATALOG },
      include: expect.objectContaining({ releases: expect.any(Object) }),
    });
    expect(result).toBe(movie);
  });
});
