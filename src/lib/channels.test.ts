import { describe, expect, it } from "vitest";
import { detectTranslationType } from "./channels";

describe("detectTranslationType", () => {
  it("detects DUB variants", () => {
    expect(detectTranslationType("DUB, BLU-RAY")).toBe("dub");
    expect(detectTranslationType("DUB, CUSTOM")).toBe("dub");
    expect(detectTranslationType("Дубляж")).toBe("dub");
    expect(detectTranslationType("полный дуб")).toBe("dub");
  });

  it("detects MVO (multi-voice)", () => {
    expect(detectTranslationType("MVO, СВ СТУДИЯ")).toBe("pro_multi");
    expect(detectTranslationType("MVO, HDREZKA STUDIO")).toBe("pro_multi");
    expect(detectTranslationType("Многоголосое озвучивание")).toBe("pro_multi");
  });

  it("detects AVO (author's voice)", () => {
    expect(detectTranslationType("AVO, Л.ВОЛОДАРСКИЙ")).toBe("author");
    expect(detectTranslationType("AVO, А.ДОЛЬСКИЙ")).toBe("author");
    expect(detectTranslationType("AVO, Ю.СЕРБИН")).toBe("author");
    expect(detectTranslationType("Авторское озвучивание")).toBe("author");
  });

  it("detects ORIGINAL", () => {
    expect(detectTranslationType("ORIGINAL")).toBe("original");
    expect(detectTranslationType("Оригинал")).toBe("original");
  });

  it("detects two-voice and single-voice variants", () => {
    expect(detectTranslationType("DVO, LostFilm")).toBe("pro_two");
    expect(detectTranslationType("Двухголосое")).toBe("pro_two");
    expect(detectTranslationType("PVO, Alex")).toBe("pro_single");
    expect(detectTranslationType("VO, HDRezka Studio")).toBe("pro_single");
    expect(detectTranslationType("Voice-over by Studio")).toBe("pro_single");
    expect(detectTranslationType("SVO, любитель")).toBe("amateur_single");
    expect(detectTranslationType("Одноголосое")).toBe("amateur_single");
  });

  it("detects commentary tracks", () => {
    expect(
      detectTranslationType("Commentary by Director Doug Liman"),
    ).toBe("commentary");
    expect(detectTranslationType("Audio Commentary")).toBe("commentary");
    expect(detectTranslationType("Дорожка с комментариями режиссёра")).toBe(
      "commentary",
    );
  });

  it("returns null when no translation marker is present", () => {
    expect(detectTranslationType("Goblin DTS:X RUSATMOS")).toBeNull();
    expect(detectTranslationType("")).toBeNull();
    expect(detectTranslationType(null)).toBeNull();
    expect(detectTranslationType(undefined)).toBeNull();
  });
});
