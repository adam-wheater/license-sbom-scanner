import { RepoScanResult } from "@/models/types";

interface CacheEntry {
  result: RepoScanResult;
  timestamp: number;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class ScanCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(repoId: string): RepoScanResult | null {
    const entry = this.cache.get(repoId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(repoId);
      return null;
    }
    return entry.result;
  }

  set(repoId: string, result: RepoScanResult): void {
    this.cache.set(repoId, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
