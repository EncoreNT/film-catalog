import { describe, expect, it } from "vitest";
import {
  assertFranchiseSlotLinkAllowed,
  FUTURE_SLOT_LINK_ERROR,
  isFutureFranchiseSlotState,
  isFutureFranchiseSlotYear,
} from "@/lib/franchises/franchise-slot-future";

describe("franchise-slot-future", () => {
  it("treats years after current as future", () => {
    expect(isFutureFranchiseSlotYear(2028, 2026)).toBe(true);
    expect(isFutureFranchiseSlotYear(2026, 2026)).toBe(false);
    expect(isFutureFranchiseSlotYear(null, 2026)).toBe(false);
  });

  it("treats empty announced slots without year as future", () => {
    expect(
      isFutureFranchiseSlotState(
        { year: null, filled: false, isAnnounced: true },
        2026,
      ),
    ).toBe(true);
    expect(
      isFutureFranchiseSlotState(
        { year: null, filled: false, isAnnounced: false },
        2026,
      ),
    ).toBe(false);
  });

  it("treats announced slots with the current year as future", () => {
    expect(
      isFutureFranchiseSlotState(
        { year: 2026, filled: false, isAnnounced: true },
        2026,
      ),
    ).toBe(true);
    expect(
      isFutureFranchiseSlotState(
        { year: 2026, filled: false, isAnnounced: false },
        2026,
      ),
    ).toBe(false);
  });

  it("ignores isAnnounced when year is in the past", () => {
    expect(
      isFutureFranchiseSlotState(
        { year: 2014, filled: false, isAnnounced: true },
        2026,
      ),
    ).toBe(false);
  });

  it("ignores isAnnounced when the slot is filled", () => {
    expect(
      isFutureFranchiseSlotState(
        { year: 2020, filled: true, isAnnounced: true },
        2026,
      ),
    ).toBe(false);
  });

  it("blocks linking movies to future yearHint slots", () => {
    expect(() =>
      assertFranchiseSlotLinkAllowed({ yearHint: 2029 }, 2026),
    ).toThrow(FUTURE_SLOT_LINK_ERROR);
    expect(() =>
      assertFranchiseSlotLinkAllowed({ yearHint: 2020 }, 2026),
    ).not.toThrow();
  });

  it("blocks linking movies to announced TBA slots", () => {
    expect(() =>
      assertFranchiseSlotLinkAllowed(
        { yearHint: null, isAnnounced: true },
        2026,
      ),
    ).toThrow(FUTURE_SLOT_LINK_ERROR);
  });

  it("blocks linking movies to announced slots with the current year", () => {
    expect(() =>
      assertFranchiseSlotLinkAllowed(
        { yearHint: 2026, isAnnounced: true },
        2026,
      ),
    ).toThrow(FUTURE_SLOT_LINK_ERROR);
    expect(() =>
      assertFranchiseSlotLinkAllowed(
        { yearHint: 2026, isAnnounced: false },
        2026,
      ),
    ).not.toThrow();
  });
});
