import sharp from "sharp";
import { COVER_MAX_BYTES } from "./cover-formats";

const MAX_EDGE = 2400;
const WEBP_QUALITY = 85;

/** Prepare a display copy before sending it to the browser or cover upload. */
export async function prepareKinoriumPoster(original: Buffer) {
  const { data, info } = await sharp(original, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColourspace("srgb")
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  if (data.length > COVER_MAX_BYTES)
    throw new Error("Подготовленный постер превышает лимит обложки.");
  return {
    buffer: data,
    mime: "image/webp",
    width: info.width,
    height: info.height,
  };
}
