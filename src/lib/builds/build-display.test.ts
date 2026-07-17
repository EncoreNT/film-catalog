import { describe, expect, it } from "vitest";
import { transcodeQualityHint } from "@/lib/builds/build-display";

describe("transcodeQualityHint", () => {
  it("returns AC-3 family hint", () => {
    expect(transcodeQualityHint("ac3")).toEqual({
      title: "Уже AC-3 или E-AC3",
      detail: "Перекодирование не улучшит качество. Оставьте режим «Копировать».",
    });
    expect(transcodeQualityHint("eac3")).not.toBeNull();
  });

  it("returns low-quality hint for codecs below AC-3 tier", () => {
    expect(transcodeQualityHint("aac")).toEqual({
      title: "Источник слабее AC-3",
      detail: "Перекодирование в E-AC3 не даст выигрыша по звуку.",
    });
  });

  it("returns null for lossless / high-tier sources", () => {
    expect(transcodeQualityHint("truehd")).toBeNull();
    expect(transcodeQualityHint("dts-hd ma")).toBeNull();
  });
});
