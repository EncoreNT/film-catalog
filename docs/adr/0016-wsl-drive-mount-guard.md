# ADR-0016: WSL drive mount guard for export/move

- **Status:** Accepted
- **Date:** 2026-08-17

## Context

The app runs in WSL. Windows folder picker sees a USB/external drive (`F:\`) even if it was plugged in after WSL started. WSL automounts drive letters only at distro boot, so `/mnt/f` is often an empty directory on the Linux VHD, not a `drvfs`/`9p` mount.

Writing there would copy the release onto the WSL disk and hide those files once `F:` is later mounted over `/mnt/f`. `statfs` on that empty dir also reports VHD free space.

Options:

1. Auto-`mount -t drvfs` on export/move — surprising hidden command.
2. Detect an unmounted Windows drive, block the copy, and mount only from an explicit UI button.

## Decision

Parse `/proc/self/mountinfo`. A path `/mnt/{letter}/...` (or `F:\...`) is a Windows drive. It is mounted only when `/mnt/{letter}` itself is `drvfs` or 9p-with-drvfs — not when it is just a folder on ext4.

- **Block** enqueue and the worker (`assertWslDriveMounted`).
- **Do not** auto-mount.
- **UI:** export/move dialogs show «Подключить диск X:», which POSTs `/api/wsl-drive/mount` (`mount /mnt/x`, then `mount -t drvfs`, then `sudo -n`). If that fails, the error includes the sudo command.

Skip the check when not running under WSL and for non-drive paths (`/home/...`, `/mnt/wsl`).

## Consequences

**Плюсы:** no silent writes to the VHD; any drive letter; mount only when the user clicks.

**Минусы / trade-offs:** the button still needs user-level `mount` (fstab `user`) or passwordless `sudo -n`; otherwise the user runs the command in a terminal.

**Follow-ups:** none required; scan/build output can reuse the same inspect helper later.
