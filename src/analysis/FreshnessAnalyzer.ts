import { ResolvedDependency, FreshnessResult, FreshnessStatus } from "@/models/types";

export class FreshnessAnalyzer {
  // Track versions seen across repos: key = "ecosystem:name", value = Map<repoName, Set<version>>
  private versionMap = new Map<string, Map<string, Set<string>>>();

  analyze(repoName: string, deps: ResolvedDependency[]): FreshnessResult[] {
    const results: FreshnessResult[] = [];

    for (const dep of deps) {
      const key = `${dep.ecosystem}:${dep.name.toLowerCase()}`;

      if (!this.versionMap.has(key)) {
        this.versionMap.set(key, new Map());
      }
      const repoVersions = this.versionMap.get(key)!;
      if (!repoVersions.has(repoName)) {
        repoVersions.set(repoName, new Set());
      }
      repoVersions.get(repoName)!.add(dep.version);

      results.push({
        dependency: dep,
        status: this.assessFreshness(dep),
        currentVersion: dep.version,
        repoName,
      });
    }

    return results;
  }

  /**
   * Returns packages that have different versions across repos.
   * Key: "ecosystem:name", Value: Map<repoName, Set<version>>
   */
  getInconsistencies(): Map<string, Map<string, Set<string>>> {
    const inconsistent = new Map<string, Map<string, Set<string>>>();

    for (const [pkg, repoVersions] of this.versionMap) {
      const allVersions = new Set<string>();
      for (const versions of repoVersions.values()) {
        for (const v of versions) allVersions.add(v);
      }
      if (allVersions.size > 1) {
        inconsistent.set(pkg, repoVersions);
      }
    }

    return inconsistent;
  }

  private assessFreshness(dep: ResolvedDependency): FreshnessStatus {
    const parsed = this.parseSemver(dep.version);
    if (!parsed) return FreshnessStatus.Unknown;

    // Without external registry data, we can only provide heuristic assessment
    // Mark v0.x as potentially pre-release
    if (parsed.major === 0) return FreshnessStatus.Unknown;

    // For everything else, we can't determine freshness without a registry
    return FreshnessStatus.Unknown;
  }

  parseSemver(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  reset(): void {
    this.versionMap.clear();
  }
}
