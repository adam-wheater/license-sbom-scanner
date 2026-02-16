import { IParser } from "./IParser";
import { ParsedDependency, Ecosystem, DependencyScope } from "@/models/types";

export class NpmParser implements IParser {
  readonly ecosystem = Ecosystem.Npm;
  readonly filePatterns = [/package\.json$/i, /package-lock\.json$/i];

  parse(repoName: string, filePath: string, content: string): ParsedDependency[] {
    // Skip anything inside node_modules
    if (/node_modules\//i.test(filePath)) return [];

    const lower = filePath.toLowerCase();

    if (lower.endsWith("package-lock.json")) {
      return this.parsePackageLock(repoName, filePath, content);
    }
    if (lower.endsWith("package.json")) {
      return this.parsePackageJson(repoName, filePath, content);
    }

    return [];
  }

  private parsePackageJson(
    repoName: string,
    filePath: string,
    content: string
  ): ParsedDependency[] {
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }

    const deps: ParsedDependency[] = [];
    const declaredLicense = this.extractLicense(parsed);

    const scopeMap: [string, DependencyScope][] = [
      ["dependencies", DependencyScope.Runtime],
      ["devDependencies", DependencyScope.Dev],
      ["peerDependencies", DependencyScope.Peer],
      ["optionalDependencies", DependencyScope.Optional],
    ];

    for (const [field, scope] of scopeMap) {
      const section = parsed[field];
      if (!section || typeof section !== "object") continue;

      for (const [name, version] of Object.entries(section)) {
        if (typeof version !== "string") continue;
        deps.push({
          name,
          version,
          ecosystem: Ecosystem.Npm,
          scope,
          sourceFile: filePath,
          declaredLicense: scope === DependencyScope.Runtime ? declaredLicense : undefined,
        });
      }
    }

    return deps;
  }

  private parsePackageLock(
    repoName: string,
    filePath: string,
    content: string
  ): ParsedDependency[] {
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }

    const deps: ParsedDependency[] = [];

    // v2/v3 lockfile format uses "packages" object
    const packages = parsed.packages;
    if (packages && typeof packages === "object") {
      for (const [pkgPath, meta] of Object.entries(packages)) {
        // Skip the root entry (empty string key)
        if (!pkgPath) continue;
        const info = meta as any;

        // Extract package name from the path (e.g., "node_modules/@scope/pkg" -> "@scope/pkg")
        const name = pkgPath.replace(/^node_modules\//, "");
        // Skip nested node_modules (transitive deps within node_modules)
        if (name.includes("node_modules/")) continue;

        const version = info.version || "*";
        const scope = info.dev ? DependencyScope.Dev : DependencyScope.Runtime;
        const declaredLicense =
          typeof info.license === "string" ? info.license : undefined;

        deps.push({
          name,
          version,
          ecosystem: Ecosystem.Npm,
          scope,
          sourceFile: filePath,
          declaredLicense,
        });
      }
      return deps;
    }

    // v1 lockfile format uses "dependencies" object
    const dependencies = parsed.dependencies;
    if (dependencies && typeof dependencies === "object") {
      for (const [name, meta] of Object.entries(dependencies)) {
        const info = meta as any;
        const version = info.version || "*";
        const scope = info.dev ? DependencyScope.Dev : DependencyScope.Runtime;

        deps.push({
          name,
          version,
          ecosystem: Ecosystem.Npm,
          scope,
          sourceFile: filePath,
        });
      }
    }

    return deps;
  }

  private extractLicense(packageJson: any): string | undefined {
    if (typeof packageJson.license === "string") {
      return packageJson.license;
    }
    if (packageJson.license && typeof packageJson.license === "object") {
      return packageJson.license.type || undefined;
    }
    return undefined;
  }
}
