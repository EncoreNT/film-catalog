import { describe, expect, it } from "vitest";
import {
  coveringMount,
  detectWsl,
  inspectWslDriveMount,
  isWslWindowsDriveFs,
  parseProcMountinfo,
  suggestedWslDriveMountCommand,
  wslDriveFromPath,
  wslDriveMountAttempts,
  wslDriveMountFailedMessage,
  wslDriveUnmountedMessage,
} from "@/lib/shared/wsl-drive-mount";

const ROOT_EXT4 =
  "82 66 8:32 / / rw,relatime - ext4 /dev/sdc rw,discard,errors=remount-ro,data=ordered";
const MNT_C_9P =
  "163 82 0:85 / /mnt/c rw,noatime - 9p C:\\134 rw,dirsync,aname=drvfs;path=C:\\;uid=1000;gid=1000;symlinkroot=/mnt/";
const MNT_D_9P =
  "164 82 0:86 / /mnt/d rw,noatime - 9p D:\\134 rw,dirsync,aname=drvfs;path=D:\\;uid=1000;gid=1000;symlinkroot=/mnt/";
const MNT_F_DRVFS =
  "170 82 0:90 / /mnt/f rw,noatime - drvfs F: rw,metadata";

const typicalWslMounts = parseProcMountinfo(
  [ROOT_EXT4, MNT_C_9P, MNT_D_9P].join("\n"),
);

describe("detectWsl", () => {
  it("detects WSL2 kernel version string", () => {
    expect(
      detectWsl(
        "Linux version 5.15.153.1-microsoft-standard-WSL2 (root@941d701f84f1)",
      ),
    ).toBe(true);
  });

  it("rejects a generic Linux kernel", () => {
    expect(
      detectWsl("Linux version 6.8.0-40-generic (buildd@lcy02-amd64-001)"),
    ).toBe(false);
  });
});

describe("wslDriveFromPath", () => {
  it("extracts the letter from a WSL mount path", () => {
    expect(wslDriveFromPath("/mnt/f/TV/Movies")).toEqual({
      letter: "F",
      mountPoint: "/mnt/f",
    });
  });

  it("accepts the drive root without a trailing slash", () => {
    expect(wslDriveFromPath("/mnt/f")).toEqual({
      letter: "F",
      mountPoint: "/mnt/f",
    });
  });

  it("normalizes a Windows path to the WSL mount", () => {
    expect(wslDriveFromPath("F:\\TV\\Movies")).toEqual({
      letter: "F",
      mountPoint: "/mnt/f",
    });
  });

  it("does not treat /mnt/wsl as drive W", () => {
    expect(wslDriveFromPath("/mnt/wsl")).toBeNull();
    expect(wslDriveFromPath("/mnt/wslg/runtime-dir")).toBeNull();
  });

  it("ignores non-Windows POSIX paths", () => {
    expect(wslDriveFromPath("/home/encore/films")).toBeNull();
    expect(wslDriveFromPath("/mnt/data/movies")).toBeNull();
  });
});

describe("parseProcMountinfo", () => {
  it("parses WSL2 9p drvfs mounts", () => {
    const mounts = typicalWslMounts;
    const c = mounts.find((m) => m.mountPoint === "/mnt/c");
    expect(c).toMatchObject({
      fsType: "9p",
      mountPoint: "/mnt/c",
    });
    expect(c?.superOptions).toContain("drvfs");
    expect(isWslWindowsDriveFs(c!)).toBe(true);
  });

  it("unescapes octal sequences in source", () => {
    const [entry] = parseProcMountinfo(MNT_C_9P);
    expect(entry.source).toBe("C:\\");
  });
});

describe("coveringMount", () => {
  it("picks the longest matching mount point", () => {
    const covering = coveringMount(typicalWslMounts, "/mnt/d/Movies/film.mkv");
    expect(covering?.mountPoint).toBe("/mnt/d");
  });

  it("falls back to root when the drive is not mounted", () => {
    const covering = coveringMount(typicalWslMounts, "/mnt/f/TV");
    expect(covering?.mountPoint).toBe("/");
    expect(covering?.fsType).toBe("ext4");
  });
});

describe("inspectWslDriveMount", () => {
  it("reports not-windows-drive for local POSIX paths", () => {
    expect(inspectWslDriveMount("/home/encore/out", typicalWslMounts)).toEqual({
      kind: "not-windows-drive",
    });
  });

  it("reports mounted when /mnt/d is a 9p drvfs mount", () => {
    expect(inspectWslDriveMount("/mnt/d/TV/Movies", typicalWslMounts)).toEqual({
      kind: "mounted",
      drive: { letter: "D", mountPoint: "/mnt/d" },
    });
  });

  it("reports unmounted when /mnt/f is only an empty directory on the VHD", () => {
    expect(inspectWslDriveMount("F:\\TV", typicalWslMounts)).toEqual({
      kind: "unmounted",
      drive: { letter: "F", mountPoint: "/mnt/f" },
    });
  });

  it("accepts a classic drvfs fstype", () => {
    const mounts = parseProcMountinfo([ROOT_EXT4, MNT_F_DRVFS].join("\n"));
    expect(inspectWslDriveMount("/mnt/f/Movies", mounts)).toEqual({
      kind: "mounted",
      drive: { letter: "F", mountPoint: "/mnt/f" },
    });
  });
});

describe("messages and mount attempts", () => {
  it("names the drive in the error", () => {
    expect(wslDriveUnmountedMessage("F")).toBe(
      "Диск F: не смонтирован в WSL",
    );
  });

  it("suggests a sudo remount command for the letter", () => {
    expect(suggestedWslDriveMountCommand("F")).toBe(
      "sudo mkdir -p /mnt/f && sudo mount -t drvfs F: /mnt/f",
    );
  });

  it("tries user mount before sudo -n", () => {
    expect(wslDriveMountAttempts("F")).toEqual([
      { file: "mount", args: ["/mnt/f"] },
      { file: "mount", args: ["-t", "drvfs", "F:", "/mnt/f"] },
      { file: "sudo", args: ["-n", "mount", "-t", "drvfs", "F:", "/mnt/f"] },
    ]);
  });

  it("explains how to mount when the button cannot", () => {
    expect(wslDriveMountFailedMessage("F")).toBe(
      "Не удалось подключить диск F:. Выполните в терминале: sudo mkdir -p /mnt/f && sudo mount -t drvfs F: /mnt/f",
    );
  });
});
