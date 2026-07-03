import { describe, expect, it } from "vitest";
import { isImageBuffer } from "@/lib/covers/cover-formats";
import {
  isMkvImageAttachment,
  listMkvImageAttachments,
  pickMkvImageAttachment,
} from "@/lib/covers/cover-formats-mkv";

describe("isImageBuffer", () => {
  it("rejects TTF magic bytes", () => {
    const ttf = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00]);
    expect(isImageBuffer(ttf)).toBe(false);
  });

  it("accepts PNG magic bytes", () => {
    const png = Buffer.alloc(12);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isImageBuffer(png)).toBe(true);
  });
});

describe("pickMkvImageAttachment", () => {
  it("skips font attachments and picks the image", () => {
    const attachments = [
      {
        id: 1,
        content_type: "application/x-truetype-font",
        file_name: "Arial.ttf",
      },
      {
        id: 2,
        content_type: "image/jpeg",
        file_name: "cover.jpg",
      },
    ];
    expect(pickMkvImageAttachment(attachments)?.id).toBe(2);
  });

  it("returns null when only non-image attachments exist", () => {
    const attachments = [
      {
        id: 1,
        content_type: "application/x-truetype-font",
        file_name: "Arial.ttf",
      },
      {
        id: 2,
        content_type: "application/octet-stream",
        file_name: "Font.otf",
      },
    ];
    expect(pickMkvImageAttachment(attachments)).toBeNull();
  });

  it("accepts image by file extension when MIME is missing", () => {
    const attachments = [
      {
        id: 1,
        content_type: "",
        file_name: "poster.png",
      },
    ];
    expect(isMkvImageAttachment(attachments[0])).toBe(true);
  });

  it("preserves MKV attachment order for image candidates", () => {
    const attachments = [
      {
        id: 1,
        content_type: "application/x-truetype-font",
        file_name: "Arial.ttf",
      },
      {
        id: 2,
        content_type: "image/png",
        file_name: "cover.png",
      },
      {
        id: 3,
        content_type: "image/jpeg",
        file_name: "thumb.jpg",
      },
    ];
    expect(listMkvImageAttachments(attachments).map((a) => a.id)).toEqual([
      2, 3,
    ]);
  });
});
