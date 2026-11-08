export type StorageKind = "local" | "external";

export interface StorageOption {
  id: number;
  name: string;
  path?: string | null;
  _count?: { releases: number };
  capacityBytes?: number | null;
  usage?: { knownBytes: number; unknownSizeCount: number };
}
