import { ScanCache } from "@/scanning/ScanCache";
import { RepoScanResult, Ecosystem } from "@/models/types";

function makeResult(repoId: string, repoName: string): RepoScanResult {
  return {
    repoName,
    repoId,
    dependencies: [],
    violations: [],
    freshnessResults: [],
    sbom: { bomFormat: "CycloneDX", specVersion: "1.5", components: [] } as any,
    scannedAt: new Date(),
    fileCount: 0,
    internalPackages: [],
  };
}

describe("ScanCache", () => {
  test("stores and retrieves results", () => {
    const cache = new ScanCache();
    const result = makeResult("repo-1", "my-repo");

    cache.set("repo-1", result);
    expect(cache.get("repo-1")).toBe(result);
    expect(cache.size).toBe(1);
  });

  test("returns null for missing entries", () => {
    const cache = new ScanCache();
    expect(cache.get("nonexistent")).toBeNull();
  });

  test("expires entries after TTL", () => {
    const cache = new ScanCache(100); // 100ms TTL
    const result = makeResult("repo-1", "my-repo");

    cache.set("repo-1", result);
    expect(cache.get("repo-1")).toBe(result);

    // Advance time past TTL
    jest.useFakeTimers();
    jest.advanceTimersByTime(150);
    expect(cache.get("repo-1")).toBeNull();
    jest.useRealTimers();
  });

  test("clear removes all entries", () => {
    const cache = new ScanCache();
    cache.set("repo-1", makeResult("repo-1", "a"));
    cache.set("repo-2", makeResult("repo-2", "b"));
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("repo-1")).toBeNull();
  });
});
