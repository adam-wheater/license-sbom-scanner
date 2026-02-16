import { IParser } from "./IParser";
import { ParsedDependency, Ecosystem, DependencyScope } from "@/models/types";

export class MavenParser implements IParser {
  readonly ecosystem = Ecosystem.Maven;
  readonly filePatterns = [/pom\.xml$/i];

  parse(repoName: string, filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Extract project-level license
    const declaredLicense = this.extractProjectLicense(content);

    // Extract <dependency> blocks
    // Remove <dependencyManagement> sections first to avoid duplicates
    const withoutManagement = content.replace(
      /<dependencyManagement>[\s\S]*?<\/dependencyManagement>/gi,
      ""
    );

    const depBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/gi;
    let match: RegExpExecArray | null;

    while ((match = depBlockRegex.exec(withoutManagement)) !== null) {
      const block = match[1];
      const groupId = this.extractTag(block, "groupId");
      const artifactId = this.extractTag(block, "artifactId");
      const version = this.extractTag(block, "version") || "*";
      const scopeStr = this.extractTag(block, "scope");

      if (!groupId || !artifactId) continue;

      const name = `${groupId}:${artifactId}`;
      const scope = this.mapScope(scopeStr);

      deps.push({
        name,
        version,
        ecosystem: Ecosystem.Maven,
        scope,
        sourceFile: filePath,
        declaredLicense: declaredLicense || undefined,
      });
    }

    return deps;
  }

  private extractTag(block: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>\\s*([^<]+)\\s*</${tag}>`, "i");
    const match = block.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractProjectLicense(content: string): string | null {
    // Look for <licenses><license><name>...</name></license></licenses>
    const licensesMatch = content.match(
      /<licenses>\s*<license>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/license>/i
    );
    if (!licensesMatch) return null;

    return this.normalizeLicenseName(licensesMatch[1].trim());
  }

  private normalizeLicenseName(name: string): string {
    const lower = name.toLowerCase();

    if (lower.includes("apache") && lower.includes("2")) return "Apache-2.0";
    if (lower.includes("mit")) return "MIT";
    if (lower.includes("bsd") && lower.includes("3")) return "BSD-3-Clause";
    if (lower.includes("bsd") && lower.includes("2")) return "BSD-2-Clause";
    if (lower.includes("eclipse public license") && lower.includes("2")) return "EPL-2.0";
    if (lower.includes("eclipse public license") || lower.includes("epl")) return "EPL-1.0";
    if (lower.includes("lgpl") && lower.includes("3")) return "LGPL-3.0-only";
    if (lower.includes("lgpl") && lower.includes("2")) return "LGPL-2.1-only";
    if (lower.includes("gpl") && lower.includes("3")) return "GPL-3.0-only";
    if (lower.includes("gpl") && lower.includes("2")) return "GPL-2.0-only";
    if (lower.includes("mozilla") || lower.includes("mpl")) return "MPL-2.0";
    if (lower.includes("cddl")) return "CDDL-1.0";
    if (lower.includes("isc")) return "ISC";
    if (lower.includes("unlicense")) return "Unlicense";

    return name;
  }

  private mapScope(scopeStr: string | null): DependencyScope {
    if (!scopeStr) return DependencyScope.Runtime;

    switch (scopeStr.toLowerCase()) {
      case "test":
        return DependencyScope.Test;
      case "provided":
        return DependencyScope.Optional;
      case "runtime":
        return DependencyScope.Runtime;
      case "system":
        return DependencyScope.Runtime;
      default:
        return DependencyScope.Runtime;
    }
  }
}
