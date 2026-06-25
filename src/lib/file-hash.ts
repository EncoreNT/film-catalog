import { createReadStream } from "fs";
import { createHash } from "crypto";

const PREFIX_BYTES = 16 * 1024 * 1024; // 16 MB

export async function computeFileHashPrefix(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    let bytesRead = 0;
    const stream = createReadStream(filePath, {
      highWaterMark: 64 * 1024,
    });

    stream.on("data", (chunk: string | Buffer) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      if (bytesRead >= PREFIX_BYTES) {
        stream.destroy();
        return;
      }
      const remaining = PREFIX_BYTES - bytesRead;
      if (buf.length > remaining) {
        hash.update(buf.subarray(0, remaining));
        bytesRead = PREFIX_BYTES;
        stream.destroy();
      } else {
        hash.update(buf);
        bytesRead += buf.length;
      }
    });

    stream.on("close", () => resolve(hash.digest("hex")));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
