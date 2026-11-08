import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exec: vi.fn(), exists: vi.fn() }));
vi.mock("node:child_process", () => ({
  execFile: Object.assign(vi.fn(), {
    [Symbol.for("nodejs.util.promisify.custom")]: mocks.exec,
  }),
}));
vi.mock("node:fs", () => ({ existsSync: mocks.exists }));

import {
  NativePickerCancelledError,
  pickPathNative,
} from "./native-path-picker";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process, "platform", "get").mockReturnValue("linux");
  mocks.exists.mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("native path picker", () => {
  it("uses Windows OpenFileDialog on WSL and preserves Cyrillic, spaces and BOM", async () => {
    mocks.exec.mockResolvedValue({
      stdout: "\uFEFFF:\\Фильмы\\Семь (1995).mkv\r\n",
    });
    expect(await pickPathNative("file")).toBe("F:\\Фильмы\\Семь (1995).mkv");
    const [command, args, options] = mocks.exec.mock.calls[0];
    expect(command).toContain("powershell.exe");
    expect(args).toContain("-STA");
    expect(args.at(-1)).toContain("OpenFileDialog");
    expect(args.at(-1)).toContain("$dialog.FileName");
    expect(args.at(-1)).toContain("CheckFileExists = $true");
    expect(options.encoding).toBe("utf8");
  });

  it.each(["file", "directory"] as const)(
    "does not open a second dialog when Windows %s selection is cancelled",
    async (kind) => {
      mocks.exec.mockResolvedValue({ stdout: "\r\n" });
      await expect(pickPathNative(kind)).rejects.toBeInstanceOf(
        NativePickerCancelledError,
      );
      expect(mocks.exec).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps the folder picker mode", async () => {
    mocks.exec.mockResolvedValue({ stdout: "F:\\Фильмы" });
    expect(await pickPathNative("directory")).toBe("F:\\Фильмы");
    const script = mocks.exec.mock.calls[0][1].at(-1);
    expect(script).toContain("FolderBrowserDialog");
    expect(script).toContain("$dialog.SelectedPath");
    expect(script).not.toContain("OpenFileDialog");
  });

  it("uses Zenity without directory mode on Linux and recognizes cancellation", async () => {
    mocks.exists.mockReturnValue(false);
    mocks.exec.mockResolvedValueOnce({ stdout: "/home/user/film.mkv\n" });
    expect(await pickPathNative("file")).toBe("/home/user/film.mkv");
    expect(mocks.exec.mock.calls[0][0]).toBe("zenity");
    expect(mocks.exec.mock.calls[0][1]).not.toContain("--directory");
    mocks.exec.mockRejectedValueOnce(
      Object.assign(new Error("cancelled"), { code: 1 }),
    );
    await expect(pickPathNative("file")).rejects.toBeInstanceOf(
      NativePickerCancelledError,
    );
  });

  it("uses the macOS file dialog", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    mocks.exec.mockResolvedValueOnce({ stdout: "/Users/test/film.mkv\n" });
    expect(await pickPathNative("file")).toBe("/Users/test/film.mkv");
    expect(mocks.exec.mock.calls[0][1][1]).toContain("choose file");
    mocks.exec.mockRejectedValueOnce(new Error("User canceled (-128)"));
    await expect(pickPathNative("file")).rejects.toBeInstanceOf(
      NativePickerCancelledError,
    );
  });
});
