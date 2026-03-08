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
    const version = dep.version;

    // Flag unpinned version ranges as Unknown
    if (version === "*" || version === "latest" || version.startsWith(">=")) {
      return FreshnessStatus.Unknown;
    }

    const parsed = this.parseSemver(version);
    if (!parsed) return FreshnessStatus.Unknown;

    // Flag 0.x.y as pre-release / Unknown
    if (parsed.major === 0) return FreshnessStatus.Unknown;

    // Compare against highest major version seen across all repos for the same package
    const key = `${dep.ecosystem}:${dep.name.toLowerCase()}`;
    const repoVersions = this.versionMap.get(key);
    if (repoVersions) {
      let highestMajor = parsed.major;
      let highestMinor = parsed.minor;
      for (const versions of repoVersions.values()) {
        for (const v of versions) {
          const p = this.parseSemver(v);
          if (p) {
            if (p.major > highestMajor) {
              highestMajor = p.major;
              highestMinor = p.minor;
            } else if (p.major === highestMajor && p.minor > highestMinor) {
              highestMinor = p.minor;
            }
          }
        }
      }

      if (parsed.major < highestMajor) {
        return FreshnessStatus.MajorBehind;
      }
      if (parsed.minor < highestMinor) {
        return FreshnessStatus.MinorBehind;
      }
    }

    return FreshnessStatus.Current;
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
