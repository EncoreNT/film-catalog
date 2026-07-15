import {
  canMarkSlotUnreleased,
  isFutureFranchiseSlot,
} from "@/lib/franchises/franchise-summary";

export const FUTURE_SLOT_LINK_ERROR =
  "Нельзя привязать фильм к слоту будущего релиза.";

export function currentCalendarYear(): number {
  return new Date().getFullYear();
}

export type FutureSlotInput = {
  year?: number | null;
  filled?: boolean;
  isAnnounced?: boolean;
};

export { canMarkSlotUnreleased };

/** Slot is future when its year is after now, or unreleased with no year / current year. */
export function isFutureFranchiseSlotState(
  input: FutureSlotInput,
  currentYear = currentCalendarYear(),
): boolean {
  return isFutureFranchiseSlot(
    {
      year: input.year ?? null,
      filled: input.filled,
      isAnnounced: input.isAnnounced ?? false,
    },
    currentYear,
  );
}

/** @deprecated Prefer {@link isFutureFranchiseSlotState} when isAnnounced is available. */
export function isFutureFranchiseSlotYear(
  year: number | null | undefined,
  currentYear = currentCalendarYear(),
): boolean {
  return isFutureFranchiseSlotState({ year, filled: false }, currentYear);
}

export function assertFranchiseSlotLinkAllowed(
  slot: { yearHint?: number | null; isAnnounced?: boolean },
  currentYear = currentCalendarYear(),
): void {
  if (
    isFutureFranchiseSlotState(
      {
        year: slot.yearHint ?? null,
        filled: false,
        isAnnounced: slot.isAnnounced,
      },
      currentYear,
    )
  ) {
    throw new Error(FUTURE_SLOT_LINK_ERROR);
  }
}
