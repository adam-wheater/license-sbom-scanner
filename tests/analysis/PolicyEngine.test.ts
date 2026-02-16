import { PolicyEngine } from "@/analysis/PolicyEngine";
import {
  LicenseCategory,
  PolicyAction,
  ResolvedDependency,
  Ecosystem,
  DependencyScope,
} from "@/models/types";

function makeDep(
  overrides: Partial<ResolvedDependency> = {}
): ResolvedDependency {
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

describe("PolicyEngine", () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  test("allows permissive licenses with default policy", () => {
    const violations = engine.evaluate("repo", [
      makeDep({ license: "MIT", licenseCategory: LicenseCategory.Permissive }),
    ]);
    expect(violations).toHaveLength(0);
  });

  test("blocks strong copyleft with default policy", () => {
    const violations = engine.evaluate("repo", [
      makeDep({
        name: "gpl-package",
        license: "GPL-3.0-only",
        licenseCategory: LicenseCategory.StrongCopyleft,
      }),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].action).toBe(PolicyAction.Block);
    expect(violations[0].reason).toContain("blocked");
    expect(violations[0].reason).toContain("GPL-3.0-only");
  });

  test("warns on weak copyleft with default policy", () => {
    const violations = engine.evaluate("repo", [
      makeDep({
        name: "lgpl-package",
        license: "LGPL-3.0-only",
        licenseCategory: LicenseCategory.WeakCopyleft,
      }),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].action).toBe(PolicyAction.Warn);
  });

  test("warns on unknown licenses", () => {
    const violations = engine.evaluate("repo", [
      makeDep({
        name: "mystery-pkg",
        license: "Unknown",
        licenseCategory: LicenseCategory.Unknown,
      }),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].action).toBe(PolicyAction.Warn);
    expect(violations[0].reason).toContain("Unknown license");
  });

  test("respects specific license overrides", () => {
    engine.setPolicy({
      categoryDefaults: {
        [LicenseCategory.Permissive]: PolicyAction.Allow,
        [LicenseCategory.WeakCopyleft]: PolicyAction.Warn,
        [LicenseCategory.StrongCopyleft]: PolicyAction.Block,
        [LicenseCategory.Proprietary]: PolicyAction.Warn,
        [LicenseCategory.Unknown]: PolicyAction.Warn,
      },
      specificOverrides: [{ licenseId: "GPL-3.0-only", action: PolicyAction.Allow }],
      excludedPackages: [],
    });

    const violations = engine.evaluate("repo", [
      makeDep({
        license: "GPL-3.0-only",
        licenseCategory: LicenseCategory.StrongCopyleft,
      }),
    ]);
    expect(violations).toHaveLength(0);
  });

  test("skips excluded packages", () => {
    engine.setPolicy({
      categoryDefaults: {
        [LicenseCategory.Permissive]: PolicyAction.Allow,
        [LicenseCategory.WeakCopyleft]: PolicyAction.Warn,
        [LicenseCategory.StrongCopyleft]: PolicyAction.Block,
        [LicenseCategory.Proprietary]: PolicyAction.Warn,
        [LicenseCategory.Unknown]: PolicyAction.Warn,
      },
      specificOverrides: [],
      excludedPackages: ["gpl-package"],
    });

    const violations = engine.evaluate("repo", [
      makeDep({
        name: "gpl-package",
        license: "GPL-3.0-only",
        licenseCategory: LicenseCategory.StrongCopyleft,
      }),
    ]);
    expect(violations).toHaveLength(0);
  });

  test("includes repo name in violations", () => {
    const violations = engine.evaluate("my-service", [
      makeDep({
        license: "GPL-3.0-only",
        licenseCategory: LicenseCategory.StrongCopyleft,
      }),
    ]);
    expect(violations[0].repoName).toBe("my-service");
  });
});
