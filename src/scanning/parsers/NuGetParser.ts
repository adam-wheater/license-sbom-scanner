import { IParser } from "./IParser";
import { ParsedDependency, Ecosystem, DependencyScope } from "@/models/types";

export class NuGetParser implements IParser {
  readonly ecosystem = Ecosystem.NuGet;
  readonly filePatterns = [
    /\.csproj$/i,
    /packages\.config$/i,
    /Directory\.Packages\.props$/i,
    /\.nuspec$/i,
  ];

  parse(repoName: string, filePath: string, content: string): ParsedDependency[] {
    const lower = filePath.toLowerCase();

    if (lower.endsWith(".csproj")) {
      return this.parseCsproj(repoName, filePath, content);
    }
    if (lower.endsWith("packages.config")) {
      return this.parsePackagesConfig(repoName, filePath, content);
    }
    if (lower.endsWith("directory.packages.props")) {
      return this.parseDirectoryPackagesProps(repoName, filePath, content);
    }
    if (lower.endsWith(".nuspec")) {
      return this.parseNuspec(repoName, filePath, content);
    }

    return [];
  }

  private parseCsproj(repoName: string, filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Extract project-level license expression if declared
    const projectLicense = this.extractTag(content, "PackageLicenseExpression");

    // PackageReference elements: <PackageReference Include="X" Version="Y" />
    const packageRefRegex =
      /<PackageReference\s+[^>]*Include\s*=\s*"([^"]+)"[^>]*?\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = packageRefRegex.exec(content)) !== null) {
      const name = match[1].trim();
      // Extract Version from the full matched tag
      const versionMatch = match[0].match(/Version\s*=\s*"([^"]*)"/i);
      const version = versionMatch ? versionMatch[1].trim() : "*";
      if (!name) continue;

      // Determine scope: if inside a Condition containing "Test" or package name suggests testing
      const scope = this.isTestDependency(name) ? DependencyScope.Test : DependencyScope.Runtime;

      deps.push({
        name,
        version,
        ecosystem: Ecosystem.NuGet,
        scope,
        sourceFile: filePath,
        declaredLicense: projectLicense || undefined,
      });
    }

    // Also handle <PackageReference Include="X"> <Version>Y</Version> </PackageReference>
    const multiLineRegex =
      /<PackageReference\s+[^>]*Include\s*=\s*"([^"]+)"[^>]*>[\s\S]*?<Version>([^<]+)<\/Version>[\s\S]*?<\/PackageReference>/gi;

    while ((match = multiLineRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const version = match[2].trim();
      if (!name) continue;

      // Avoid duplicates from the single-line regex
      if (deps.some((d) => d.name.toLowerCase() === name.toLowerCase())) continue;

      const scope = this.isTestDependency(name) ? DependencyScope.Test : DependencyScope.Runtime;

      deps.push({
        name,
        version,
        ecosystem: Ecosystem.NuGet,
        scope,
        sourceFile: filePath,
        declaredLicense: projectLicense || undefined,
      });
    }

    return deps;
  }

  private parsePackagesConfig(
    repoName: string,
    filePath: string,
    content: string
  ): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // <package id="X" version="Y" />
    const packageRegex =
      /<package\s+[^>]*id\s*=\s*"([^"]+)"[^>]*version\s*=\s*"([^"]*)"[^>]*\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = packageRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const version = match[2].trim();
      if (!name) continue;

      deps.push({
        name,
        version,
        ecosystem: Ecosystem.NuGet,
        scope: this.isTestDependency(name) ? DependencyScope.Test : DependencyScope.Runtime,
        sourceFile: filePath,
      });
    }

    return deps;
  }

  private parseDirectoryPackagesProps(
    repoName: string,
    filePath: string,
    content: string
  ): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // <PackageVersion Include="X" Version="Y" />
    const packageVersionRegex =
      /<PackageVersion\s+[^>]*Include\s*=\s*"([^"]+)"[^>]*Version\s*=\s*"([^"]*)"[^>]*\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = packageVersionRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const version = match[2].trim();
      if (!name) continue;

      deps.push({
        name,
        version,
        ecosystem: Ecosystem.NuGet,
        scope: this.isTestDependency(name) ? DependencyScope.Test : DependencyScope.Runtime,
        sourceFile: filePath,
      });
    }

    return deps;
  }

  private parseNuspec(repoName: string, filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Extract declared license: <license type="expression">MIT</license>
    const licenseMatch = content.match(/<license\s+type\s*=\s*"expression"\s*>([^<]+)<\/license>/i);
    const declaredLicense = licenseMatch ? licenseMatch[1].trim() : undefined;

    // <dependency id="X" version="Y" />
    const depRegex =
      /<dependency\s+[^>]*id\s*=\s*"([^"]+)"[^>]*version\s*=\s*"([^"]*)"[^>]*\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = depRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const version = match[2].trim();
      if (!name) continue;

      deps.push({
        name,
        version,
        ecosystem: Ecosystem.NuGet,
        scope: DependencyScope.Runtime,
        sourceFile: filePath,
        declaredLicense,
      });
    }

    return deps;
  }

  /**
   * Extracts the package ID that this file defines (i.e., the package this repo produces).
   * Returns an array of package IDs found (usually 0 or 1).
   */
  extractProducedPackageIds(filePath: string, content: string): string[] {
    const lower = filePath.toLowerCase();
    const ids: string[] = [];

    if (lower.endsWith(".nuspec")) {
      // Extract <id> from within <metadata>
      const metadataMatch = content.match(/<metadata[\s>][\s\S]*?<\/metadata>/i);
      if (metadataMatch) {
        const idMatch = metadataMatch[0].match(/<id>([^<]+)<\/id>/i);
        if (idMatch) {
          const id = idMatch[1].trim();
          if (id) ids.push(id);
        }
      }
    } else if (lower.endsWith(".csproj")) {
      // Extract <PackageId> property
      const packageId = this.extractTag(content, "PackageId");
      if (packageId) ids.push(packageId);
    }

    return ids;
  }

  private extractTag(content: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  private isTestDependency(packageName: string): boolean {
    const lower = packageName.toLowerCase();
    return (
      lower.includes("xunit") ||
      lower.includes("nunit") ||
      lower.includes("mstest") ||
      lower.includes("moq") ||
      lower.includes("nsubstitute") ||
      lower.includes("fakeiteasy") ||
      lower.includes("fluentassertions") ||
      lower.includes("shouldly") ||
      lower.includes("coverlet") ||
      lower.includes("microsoft.net.test.sdk") ||
      lower.includes("bogus") ||
      lower.includes("autofixture") ||
      lower.includes("testcontainers") ||
      lower.includes("wiremock")
    );
  }
}
