import { describe, expect, it } from "vitest";
import { pluralRu } from "./russian-plural";

describe("pluralRu", () => {
  it("handles Russian singular, paucal and plural forms", () => {
    expect(`1 ${pluralRu(1, "карточка", "карточки", "карточек")}`).toBe(
      "1 карточка",
    );
    expect(`2 ${pluralRu(2, "карточка", "карточки", "карточек")}`).toBe(
      "2 карточки",
    );
    expect(`5 ${pluralRu(5, "карточка", "карточки", "карточек")}`).toBe(
      "5 карточек",
    );
    expect(`10 ${pluralRu(10, "карточка", "карточки", "карточек")}`).toBe(
      "10 карточек",
    );
    expect(`21 ${pluralRu(21, "карточка", "карточки", "карточек")}`).toBe(
      "21 карточка",
    );
  });
});
