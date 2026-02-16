import { NuGetParser } from "@/scanning/parsers/NuGetParser";
import { Ecosystem, DependencyScope } from "@/models/types";

describe("NuGetParser", () => {
  let parser: NuGetParser;

  beforeEach(() => {
    parser = new NuGetParser();
  });

  test("parses PackageReference from .csproj", () => {
    const content = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
    <PackageReference Include="Serilog" Version="3.1.1" />
    <PackageReference Include="AutoMapper" Version="12.0.1" />
  </ItemGroup>
</Project>`;

    const deps = parser.parse("my-repo", "/src/App.csproj", content);
    expect(deps).toHaveLength(3);
    expect(deps[0]).toMatchObject({
      name: "Newtonsoft.Json",
      version: "13.0.3",
      ecosystem: Ecosystem.NuGet,
      scope: DependencyScope.Runtime,
    });
    expect(deps[1]).toMatchObject({
      name: "Serilog",
      version: "3.1.1",
    });
    expect(deps[2]).toMatchObject({
      name: "AutoMapper",
      version: "12.0.1",
    });
  });

  test("extracts PackageLicenseExpression as declaredLicense", () => {
    const content = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <PackageLicenseExpression>MIT</PackageLicenseExpression>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="SomePackage" Version="1.0.0" />
  </ItemGroup>
</Project>`;

    const deps = parser.parse("my-repo", "/src/Lib.csproj", content);
    expect(deps).toHaveLength(1);
    expect(deps[0].declaredLicense).toBe("MIT");
  });

  test("detects test dependencies", () => {
    const content = `<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="xunit" Version="2.7.0" />
    <PackageReference Include="Moq" Version="4.20.0" />
    <PackageReference Include="FluentAssertions" Version="6.12.0" />
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>
</Project>`;

    const deps = parser.parse("my-repo", "/tests/Tests.csproj", content);
    expect(deps).toHaveLength(4);
    expect(deps[0].scope).toBe(DependencyScope.Test); // xunit
    expect(deps[1].scope).toBe(DependencyScope.Test); // Moq
    expect(deps[2].scope).toBe(DependencyScope.Test); // FluentAssertions
    expect(deps[3].scope).toBe(DependencyScope.Runtime); // Newtonsoft.Json
  });

  test("parses packages.config format", () => {
    const content = `<?xml version="1.0" encoding="utf-8"?>
<packages>
  <package id="EntityFramework" version="6.4.4" targetFramework="net48" />
  <package id="Newtonsoft.Json" version="13.0.1" targetFramework="net48" />
</packages>`;

    const deps = parser.parse("my-repo", "/packages.config", content);
    expect(deps).toHaveLength(2);
    expect(deps[0]).toMatchObject({
      name: "EntityFramework",
      version: "6.4.4",
      ecosystem: Ecosystem.NuGet,
    });
  });

  test("parses Directory.Packages.props (CPM)", () => {
    const content = `<Project>
  <ItemGroup>
    <PackageVersion Include="MediatR" Version="12.2.0" />
    <PackageVersion Include="FluentValidation" Version="11.9.0" />
  </ItemGroup>
</Project>`;

    const deps = parser.parse("my-repo", "/Directory.Packages.props", content);
    expect(deps).toHaveLength(2);
    expect(deps[0]).toMatchObject({
      name: "MediatR",
      version: "12.2.0",
    });
  });

  test("parses .nuspec dependencies with declared license", () => {
    const content = `<?xml version="1.0"?>
<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">
  <metadata>
    <id>MyPackage</id>
    <license type="expression">Apache-2.0</license>
    <dependencies>
      <dependency id="Newtonsoft.Json" version="13.0.3" />
      <dependency id="Serilog" version="3.0.0" />
    </dependencies>
  </metadata>
</package>`;

    const deps = parser.parse("my-repo", "/MyPackage.nuspec", content);
    expect(deps).toHaveLength(2);
    expect(deps[0].declaredLicense).toBe("Apache-2.0");
    expect(deps[1].declaredLicense).toBe("Apache-2.0");
  });

  test("handles empty or malformed content", () => {
    expect(parser.parse("repo", "/file.csproj", "")).toHaveLength(0);
    expect(parser.parse("repo", "/file.csproj", "not xml at all")).toHaveLength(0);
    expect(parser.parse("repo", "/packages.config", "<packages></packages>")).toHaveLength(0);
  });

  test("handles PackageReference without Version attribute", () => {
    const content = `<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="SomePackage" />
  </ItemGroup>
</Project>`;

    const deps = parser.parse("my-repo", "/src/App.csproj", content);
    expect(deps).toHaveLength(1);
    expect(deps[0].version).toBe("*");
  });

  test("matches expected file patterns", () => {
    expect(parser.filePatterns.some((p) => p.test("src/MyApp.csproj"))).toBe(true);
    expect(parser.filePatterns.some((p) => p.test("packages.config"))).toBe(true);
    expect(parser.filePatterns.some((p) => p.test("Directory.Packages.props"))).toBe(true);
    expect(parser.filePatterns.some((p) => p.test("My.Package.nuspec"))).toBe(true);
    expect(parser.filePatterns.some((p) => p.test("readme.md"))).toBe(false);
  });
});
