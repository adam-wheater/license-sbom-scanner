import { SbomGenerator } from "@/analysis/SbomGenerator";
import {
  ResolvedDependency,
  Ecosystem,
  DependencyScope,
  LicenseCategory,
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

describe("SbomGenerator", () => {
  let generator: SbomGenerator;

  beforeEach(() => {
    generator = new SbomGenerator();
  });

  test("generates valid CycloneDX 1.5 document", () => {
    const sbom = generator.generate("my-repo", [makeDep()]);

    expect(sbom.bomFormat).toBe("CycloneDX");
    expect(sbom.specVersion).toBe("1.5");
    expect(sbom.serialNumber).toMatch(/^urn:uuid:/);
    expect(sbom.version).toBe(1);
    expect(sbom.metadata.tools[0].name).toBe("license-sbom-scanner");
    expect(sbom.metadata.component.name).toBe("my-repo");
    expect(sbom.components).toHaveLength(1);
  });

  test("generates correct purl for NuGet packages", () => {
    const sbom = generator.generate("repo", [
      makeDep({ name: "Newtonsoft.Json", version: "13.0.3", ecosystem: Ecosystem.NuGet }),
    ]);
    expect(sbom.components[0].purl).toBe("pkg:nuget/Newtonsoft.Json@13.0.3");
  });

  test("generates correct purl for npm scoped packages", () => {
    const sbom = generator.generate("repo", [
      makeDep({ name: "@angular/core", version: "17.0.0", ecosystem: Ecosystem.Npm }),
    ]);
    expect(sbom.components[0].purl).toContain("pkg:npm/");
    expect(sbom.components[0].purl).toContain("@17.0.0");
  });

  test("generates correct purl for Maven packages", () => {
    const sbom = generator.generate("repo", [
      makeDep({
        name: "com.google.guava:guava",
        version: "32.1.2-jre",
        ecosystem: Ecosystem.Maven,
      }),
    ]);
    expect(sbom.components[0].purl).toBe("pkg:maven/com.google.guava/guava@32.1.2-jre");
  });

  test("generates correct purl for Go packages", () => {
    const sbom = generator.generate("repo", [
      makeDep({
        name: "github.com/gin-gonic/gin",
        version: "v1.9.1",
        ecosystem: Ecosystem.Go,
      }),
    ]);
    expect(sbom.components[0].purl).toBe("pkg:golang/github.com/gin-gonic/gin@v1.9.1");
  });

  test("generates correct purl for Python packages", () => {
    const sbom = generator.generate("repo", [
      makeDep({ name: "requests", version: "2.31.0", ecosystem: Ecosystem.Python }),
    ]);
    expect(sbom.components[0].purl).toBe("pkg:pypi/requests@2.31.0");
  });

  test("sets scope correctly based on DependencyScope", () => {
    const sbom = generator.generate("repo", [
      makeDep({ scope: DependencyScope.Runtime }),
      makeDep({ name: "test-dep", scope: DependencyScope.Dev }),
      makeDep({ name: "test-dep2", scope: DependencyScope.Test }),
    ]);

    expect(sbom.components[0].scope).toBe("required");
    expect(sbom.components[1].scope).toBe("optional");
    expect(sbom.components[2].scope).toBe("optional");
  });

  test("omits license for Unknown", () => {
    const sbom = generator.generate("repo", [
      makeDep({ license: "Unknown", licenseCategory: LicenseCategory.Unknown }),
    ]);

    expect(sbom.components[0].licenses).toHaveLength(0);
  });

  test("includes license for known licenses", () => {
    const sbom = generator.generate("repo", [makeDep({ license: "MIT" })]);

    expect(sbom.components[0].licenses).toHaveLength(1);
    expect(sbom.components[0].licenses[0].license.id).toBe("MIT");
  });
});
