import { describe, expect, it } from "vitest";
import {
  initialSelectedStorageId,
  initialStorageKind,
  insertStorageOption,
  moveTargetStorageKind,
  resolveExternalStorageId,
} from "@/lib/shared/storage-picker-state";

describe("storage-picker-state", () => {
  describe("initialStorageKind", () => {
    it("defaults to local without initial storage", () => {
      expect(initialStorageKind(null)).toBe("local");
      expect(initialStorageKind(undefined)).toBe("local");
    });

    it("defaults to external when editing a release on external disk", () => {
      expect(initialStorageKind({ id: 3 })).toBe("external");
    });
  });

  describe("initialSelectedStorageId", () => {
    it("stringifies initial storage id", () => {
      expect(initialSelectedStorageId({ id: 9 })).toBe("9");
      expect(initialSelectedStorageId(null)).toBe("");
    });
  });

  describe("resolveExternalStorageId", () => {
    it("returns null for local storage", () => {
      expect(resolveExternalStorageId("local", "5")).toBeNull();
    });

    it("parses selected external id", () => {
      expect(resolveExternalStorageId("external", "12")).toBe(12);
    });

    it("returns null when external is chosen but id is empty", () => {
      expect(resolveExternalStorageId("external", "")).toBeNull();
    });
  });

  describe("moveTargetStorageKind", () => {
    it("prefers external when source is local", () => {
      expect(moveTargetStorageKind(false)).toBe("external");
    });

    it("prefers local when source is external", () => {
      expect(moveTargetStorageKind(true)).toBe("local");
    });
  });

  describe("insertStorageOption", () => {
    it("replaces existing id and sorts by Russian locale name", () => {
      const next = insertStorageOption(
        [
          { id: 1, name: "Яндекс" },
          { id: 2, name: "Старое" },
          { id: 3, name: "Архив" },
        ],
        { id: 2, name: "Бета-диск" },
      );
      expect(next.map((s) => s.name)).toEqual(["Архив", "Бета-диск", "Яндекс"]);
    });
  });
});
