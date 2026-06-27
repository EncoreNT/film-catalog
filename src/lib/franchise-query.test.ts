import { describe, expect, it } from "vitest";
import {
  buildFranchiseOrder,
  buildFranchiseWhere,
  parseFranchiseListQuery,
} from "./franchise-query";

function queryFrom(params: Record<string, string>) {
  return parseFranchiseListQuery(new URLSearchParams(params));
}

describe("buildFranchiseWhere", () => {
  it("filters by name contains q", () => {
    const where = buildFranchiseWhere(queryFrom({ q: "john" }));
    expect(where.name).toEqual({ contains: "john" });
  });

  it("returns empty where without q", () => {
    const where = buildFranchiseWhere(queryFrom({}));
    expect(where).toEqual({});
  });
});

describe("buildFranchiseOrder", () => {
  it("defaults to name asc", () => {
    expect(buildFranchiseOrder(queryFrom({}))).toEqual({ name: "asc" });
  });

  it("orders by slot count", () => {
    expect(
      buildFranchiseOrder(queryFrom({ sort: "slotCount", order: "desc" })),
    ).toEqual({ slots: { _count: "desc" } });
  });

  it("orders by createdAt", () => {
    expect(
      buildFranchiseOrder(queryFrom({ sort: "createdAt", order: "desc" })),
    ).toEqual({ createdAt: "desc" });
  });
});

describe("parseFranchiseListQuery", () => {
  it("applies defaults", () => {
    const query = parseFranchiseListQuery(new URLSearchParams());
    expect(query.page).toBe(1);
    expect(query.limit).toBe(48);
    expect(query.sort).toBe("name");
    expect(query.order).toBe("asc");
  });
});
