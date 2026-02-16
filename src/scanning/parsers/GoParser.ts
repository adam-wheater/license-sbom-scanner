import { IParser } from "./IParser";
import { ParsedDependency, Ecosystem, DependencyScope } from "@/models/types";

export class GoParser implements IParser {
  readonly ecosystem = Ecosystem.Go;
  readonly filePatterns = [/go\.mod$/i];

  parse(repoName: string, filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    const lines = content.split("\n");
    let inRequireBlock = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Single-line require: require github.com/foo/bar v1.2.3
      if (line.startsWith("require ") && !line.includes("(")) {
        const dep = this.parseSingleRequire(line, filePath);
        if (dep) deps.push(dep);
        continue;
      }

      // Multi-line require block
      if (line === "require (") {
        inRequireBlock = true;
        continue;
      }
      if (line === ")" && inRequireBlock) {
        inRequireBlock = false;
        continue;
      }

      if (inRequireBlock && line && !line.startsWith("//")) {
        const dep = this.parseRequireLine(line, filePath);
        if (dep) deps.push(dep);
      }
    }

    return deps;
  }

  private parseSingleRequire(line: string, filePath: string): ParsedDependency | null {
    // require github.com/foo/bar v1.2.3
    const match = line.match(/^require\s+(\S+)\s+(\S+)/);
    if (!match) return null;

    return {
      name: match[1],
      version: match[2],
      ecosystem: Ecosystem.Go,
      scope: DependencyScope.Runtime,
      sourceFile: filePath,
    };
  }

  private parseRequireLine(line: string, filePath: string): ParsedDependency | null {
    // github.com/foo/bar v1.2.3
    // github.com/foo/bar v1.2.3 // indirect
    const trimmed = line.replace(/\/\/.*$/, "").trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return null;

    const name = parts[0];
    const version = parts[1];
    const isIndirect = line.includes("// indirect");

    return {
      name,
      version,
      ecosystem: Ecosystem.Go,
      scope: isIndirect ? DependencyScope.Optional : DependencyScope.Runtime,
      sourceFile: filePath,
    };
  }
}
