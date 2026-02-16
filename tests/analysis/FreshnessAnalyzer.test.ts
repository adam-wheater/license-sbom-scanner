import { FreshnessAnalyzer } from "@/analysis/FreshnessAnalyzer";
import {
  ResolvedDependency,
  Ecosystem,
  DependencyScope,
  LicenseCategory,
  FreshnessStatus,
} from "@/models/types";

function makeDep(overrides: Partial<ResolvedDependency> = {}): ResolvedDependency {
  return {
    name: "test-package",
    version: "1.0.0",
    ecosystem: Ecosystem.NuGet,
    scope: DependencyScope.Runtime,
    sourceFile: "/test.csproj",
    license: "MIT",
    licenseCategory: LicenseCategory.Permissive,
    ...overrides,
  };
}

describe("FreshnessAnalyzer", () => {
  let analyzer: FreshnessAnalyzer;

  beforeEach(() => {
    analyzer = new FreshnessAnalyzer();
  });

  test("tracks versions across repos", () => {
    analyzer.analyze("repo-a", [makeDep({ version: "1.0.0" })]);
    analyzer.analyze("repo-b", [makeDep({ version: "2.0.0" })]);

    const inconsistencies = analyzer.getInconsistencies();
    expect(inconsistencies.size).toBe(1);

    const pkgVersions = inconsistencies.get("nuget:test-package")!;
    expect(pkgVersions.get("repo-a")!.has("1.0.0")).toBe(true);
    expect(pkgVersions.get("repo-b")!.has("2.0.0")).toBe(true);
  });

  test("no inconsistencies when versions match", () => {
    analyzer.analyze("repo-a", [makeDep({ version: "1.0.0" })]);
    analyzer.analyze("repo-b", [makeDep({ version: "1.0.0" })]);

    const inconsistencies = analyzer.getInconsistencies();
    expect(inconsistencies.size).toBe(0);
  });

  test("returns results for each dependency", () => {
    const results = analyzer.analyze("repo", [
      makeDep({ name: "pkg-a", version: "1.0.0" }),
      makeDep({ name: "pkg-b", version: "2.3.4" }),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].currentVersion).toBe("1.0.0");
    expect(results[0].repoName).toBe("repo");
  });

  test("parseSemver handles various formats", () => {
    expect(analyzer.parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(analyzer.parseSemver("v1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(analyzer.parseSemver("1.2.3-beta.1")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(analyzer.parseSemver("not-semver")).toBeNull();
    expect(analyzer.parseSemver("*")).toBeNull();
  });

  test("reset clears all tracking", () => {
    analyzer.analyze("repo-a", [makeDep({ version: "1.0.0" })]);
    analyzer.analyze("repo-b", [makeDep({ version: "2.0.0" })]);
    expect(analyzer.getInconsistencies().size).toBe(1);

    analyzer.reset();
    expect(analyzer.getInconsistencies().size).toBe(0);
  });
});
