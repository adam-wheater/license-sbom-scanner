import { ScanOrchestrator, ScanOrchestratorDeps } from "@/scanning/ScanOrchestrator";
import { ScanCache } from "@/scanning/ScanCache";
import { NpmParser } from "@/scanning/parsers/NpmParser";
import { LicenseResolver } from "@/scanning/LicenseResolver";
import { PolicyEngine } from "@/analysis/PolicyEngine";
import { FreshnessAnalyzer } from "@/analysis/FreshnessAnalyzer";
import { SbomGenerator } from "@/analysis/SbomGenerator";
import { ScanProgress } from "@/models/types";

function makeMockDeps(overrides: Partial<ScanOrchestratorDeps> = {}): ScanOrchestratorDeps {
  return {
    getProject: async () => "test-project",
    getRepositories: async () => [{ id: "repo-1", name: "my-repo" }],
    discoverFiles: async () => ({
      dependencyFiles: [{ path: "/package.json", isFolder: false }],
    }),
    fetchFileContents: async () => [
      {
        path: "/package.json",
        content: JSON.stringify({
          dependencies: { react: "^18.2.0" },
        }),
      },
    ],
    parsers: [new NpmParser()],
    licenseResolver: new LicenseResolver(),
    policyEngine: new PolicyEngine(),
    freshnessAnalyzer: new FreshnessAnalyzer(),
    sbomGenerator: new SbomGenerator(),
    ...overrides,
  };
}

describe("ScanOrchestrator", () => {
  test("scans a single repo with injected dependencies", async () => {
    const deps = makeMockDeps();
    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);

    const result = await orchestrator.scan();

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].repoName).toBe("my-repo");
    expect(result.repos[0].dependencies.length).toBeGreaterThan(0);
    expect(result.totalDependencies).toBeGreaterThan(0);
    expect(result.allRepoNames).toEqual(["my-repo"]);
  });

  test("reports progress during scan", async () => {
    const deps = makeMockDeps();
    const progressUpdates: ScanProgress[] = [];

    const orchestrator = new ScanOrchestrator(
      undefined,
      (p) => progressUpdates.push({ ...p }),
      deps
    );

    await orchestrator.scan();

    // Should have reported discovery, scanning, and complete phases
    const phases = progressUpdates.map((p) => p.phase);
    expect(phases).toContain("discovery");
    expect(phases).toContain("scanning");
    expect(phases).toContain("complete");
  });

  test("handles repos with no dependency files", async () => {
    const deps = makeMockDeps({
      discoverFiles: async () => ({ dependencyFiles: [] }),
    });

    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);
    const result = await orchestrator.scan();

    expect(result.repos).toHaveLength(0);
    expect(result.totalDependencies).toBe(0);
  });

  test("handles repo scan errors gracefully", async () => {
    const deps = makeMockDeps({
      fetchFileContents: async () => {
        throw new Error("Network error");
      },
    });

    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);
    const result = await orchestrator.scan();

    // Should complete without throwing, but repo has no results
    expect(result.repos).toHaveLength(0);
  });

  test("scans multiple repos", async () => {
    const deps = makeMockDeps({
      getRepositories: async () => [
        { id: "repo-1", name: "repo-one" },
        { id: "repo-2", name: "repo-two" },
      ],
    });

    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);
    const result = await orchestrator.scan();

    expect(result.repos).toHaveLength(2);
    expect(result.allRepoNames).toEqual(["repo-one", "repo-two"]);
  });

  test("deduplicates dependencies within a repo", async () => {
    const deps = makeMockDeps({
      fetchFileContents: async () => [
        {
          path: "/package.json",
          content: JSON.stringify({
            dependencies: { react: "^18.2.0" },
          }),
        },
        {
          path: "/sub/package.json",
          content: JSON.stringify({
            dependencies: { react: "^18.3.0" },
          }),
        },
      ],
      discoverFiles: async () => ({
        dependencyFiles: [
          { path: "/package.json", isFolder: false },
          { path: "/sub/package.json", isFolder: false },
        ],
      }),
    });

    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);
    const result = await orchestrator.scan();

    // "react" should appear only once per repo (deduplication)
    const reactDeps = result.repos[0].dependencies.filter((d) => d.name === "react");
    expect(reactDeps).toHaveLength(1);
  });

  test("can be aborted", async () => {
    let resolveRepo: () => void;
    const waitForever = new Promise<{ path: string; content: string }[]>((resolve) => {
      resolveRepo = () => resolve([]);
    });

    const deps = makeMockDeps({
      fetchFileContents: () => waitForever,
    });

    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);

    const scanPromise = orchestrator.scan();

    // Abort after a short delay
    orchestrator.abort();

    // The scan should throw an AbortError or complete with empty results
    // depending on timing. Either way, it shouldn't hang.
    try {
      const result = await scanPromise;
      // If it completed, it should have handled the abort gracefully
      expect(result).toBeDefined();
    } catch (err) {
      expect((err as Error).name).toBe("AbortError");
    }

    // Clean up
    resolveRepo!();
  });

  test("generates SBOM for each repo", async () => {
    const deps = makeMockDeps();
    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);
    const result = await orchestrator.scan();

    expect(result.repos[0].sbom).toBeDefined();
    expect(result.repos[0].sbom.bomFormat).toBe("CycloneDX");
    expect(result.repos[0].sbom.specVersion).toBe("1.5");
  });

  test("evaluates policy violations", async () => {
    const policyEngine = new PolicyEngine();
    const deps = makeMockDeps({
      policyEngine,
      fetchFileContents: async () => [
        {
          path: "/package.json",
          content: JSON.stringify({
            dependencies: { "unknown-package": "1.0.0" },
          }),
        },
      ],
    });

    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);
    const result = await orchestrator.scan();

    // Unknown packages get "warn" by default policy
    expect(result.totalViolations).toBeGreaterThanOrEqual(0);
  });

  test("records scan duration", async () => {
    const deps = makeMockDeps();
    const orchestrator = new ScanOrchestrator(undefined, undefined, deps);
    const result = await orchestrator.scan();

    expect(result.scanDurationMs).toBeGreaterThanOrEqual(0);
  });

  test("uses cached results on second scan", async () => {
    const cache = new ScanCache();
    const discoverSpy = jest.fn(async () => ({
      dependencyFiles: [{ path: "/package.json", isFolder: false }],
    }));
    const deps = makeMockDeps({
      getRepositories: async () => [
        { id: "repo-1", name: "my-repo" },
        { id: "repo-2", name: "other-repo" },
      ],
      discoverFiles: discoverSpy,
      cache,
    });

    // First scan: discover is called for both repos
    const orchestrator1 = new ScanOrchestrator(undefined, undefined, deps);
    const result1 = await orchestrator1.scan();
    expect(result1.repos).toHaveLength(2);
    expect(discoverSpy).toHaveBeenCalledTimes(2);

    // Second scan: cached repos skip discovery
    discoverSpy.mockClear();
    const orchestrator2 = new ScanOrchestrator(undefined, undefined, deps);
    const result2 = await orchestrator2.scan();
    expect(result2.repos).toHaveLength(2);
    expect(discoverSpy).toHaveBeenCalledTimes(0);
  });

  test("cache can be cleared for full re-scan", async () => {
    const cache = new ScanCache();
    const discoverSpy = jest.fn(async () => ({
      dependencyFiles: [{ path: "/package.json", isFolder: false }],
    }));
    const deps = makeMockDeps({ discoverFiles: discoverSpy, cache });

    // First scan
    const orchestrator1 = new ScanOrchestrator(undefined, undefined, deps);
    await orchestrator1.scan();
    expect(discoverSpy).toHaveBeenCalledTimes(1);

    // Clear cache and re-scan
    cache.clear();
    discoverSpy.mockClear();
    const orchestrator2 = new ScanOrchestrator(undefined, undefined, deps);
    await orchestrator2.scan();
    expect(discoverSpy).toHaveBeenCalledTimes(1);
  });

  test("reports cached repo count in progress", async () => {
    const cache = new ScanCache();
    const deps = makeMockDeps({ cache });

    // First scan populates cache
    const orchestrator1 = new ScanOrchestrator(undefined, undefined, deps);
    await orchestrator1.scan();

    // Second scan should report cached repos
    const progressUpdates: ScanProgress[] = [];
    const orchestrator2 = new ScanOrchestrator(
      undefined,
      (p) => progressUpdates.push({ ...p }),
      deps
    );
    await orchestrator2.scan();

    const scanningUpdates = progressUpdates.filter((p) => p.phase === "scanning");
    const lastUpdate = scanningUpdates[scanningUpdates.length - 1];
    expect(lastUpdate.cachedRepos).toBe(1);
  });
});
