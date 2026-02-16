import { LicenseResolver } from "@/scanning/LicenseResolver";
import { Ecosystem, DependencyScope, LicenseCategory } from "@/models/types";

describe("LicenseResolver", () => {
  let resolver: LicenseResolver;

  beforeEach(() => {
    resolver = new LicenseResolver();
  });

  test("uses declared license when available", () => {
    const result = resolver.resolve([
      {
        name: "unknown-package",
        version: "1.0.0",
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: "/test.csproj",
        declaredLicense: "Apache-2.0",
      },
    ]);

    expect(result[0].license).toBe("Apache-2.0");
    expect(result[0].licenseCategory).toBe(LicenseCategory.Permissive);
  });

  test("falls back to known registry", () => {
    const result = resolver.resolve([
      {
        name: "newtonsoft.json",
        version: "13.0.3",
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: "/test.csproj",
      },
    ]);

    expect(result[0].license).toBe("MIT");
    expect(result[0].licenseCategory).toBe(LicenseCategory.Permissive);
  });

  test("returns Unknown when not found", () => {
    const result = resolver.resolve([
      {
        name: "super-obscure-package-xyz",
        version: "0.1.0",
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: "/test.csproj",
      },
    ]);

    expect(result[0].license).toBe("Unknown");
    expect(result[0].licenseCategory).toBe(LicenseCategory.Unknown);
  });

  test("normalizes common license name variations", () => {
    const result = resolver.resolve([
      {
        name: "pkg1",
        version: "1.0.0",
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: "/test.csproj",
        declaredLicense: "MIT License",
      },
      {
        name: "pkg2",
        version: "1.0.0",
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: "/test.csproj",
        declaredLicense: "Apache License 2.0",
      },
    ]);

    expect(result[0].license).toBe("MIT");
    expect(result[1].license).toBe("Apache-2.0");
  });

  test("categorizes strong copyleft licenses correctly", () => {
    const result = resolver.resolve([
      {
        name: "gpl-pkg",
        version: "1.0.0",
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: "/test.csproj",
        declaredLicense: "GPL-3.0-only",
      },
    ]);

    expect(result[0].licenseCategory).toBe(LicenseCategory.StrongCopyleft);
  });

  test("categorizes weak copyleft licenses correctly", () => {
    const result = resolver.resolve([
      {
        name: "lgpl-pkg",
        version: "1.0.0",
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: "/test.csproj",
        declaredLicense: "LGPL-3.0-only",
      },
    ]);

    expect(result[0].licenseCategory).toBe(LicenseCategory.WeakCopyleft);
  });

  test("resolves npm packages from registry", () => {
    const result = resolver.resolve([
      {
        name: "react",
        version: "18.2.0",
        ecosystem: Ecosystem.Npm,
        scope: DependencyScope.Runtime,
        sourceFile: "/package.json",
      },
    ]);

    expect(result[0].license).toBe("MIT");
  });
});
