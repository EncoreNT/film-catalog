import { describe, expect, it } from "vitest";
import {
  countFilledSlots,
  countTotalSlots,
} from "@/lib/franchises/franchise-utils";

describe("franchise-utils", () => {
  const slots = [
    { movieId: 1 },
    { movieId: null },
    { movieId: 3 },
    { movieId: null },
  ];

  it("counts filled slots", () => {
    expect(countFilledSlots(slots)).toBe(2);
  });

  it("counts total slots", () => {
    expect(countTotalSlots(slots)).toBe(4);
  });
});
