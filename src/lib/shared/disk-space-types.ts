export interface DiskSpaceInfo {
  totalBytes: number;
  freeBytes: number;
  path: string;
}

export interface UnmountedWslDrive {
  letter: string;
  mountPoint: string;
}
