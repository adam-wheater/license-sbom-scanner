import { IParser } from "./IParser";
import { ParsedDependency, Ecosystem, DependencyScope } from "@/models/types";

export class PythonParser implements IParser {
  readonly ecosystem = Ecosystem.Python;
  readonly filePatterns = [
    /requirements.*\.txt$/i,
    /pyproject\.toml$/i,
    /setup\.py$/i,
    /setup\.cfg$/i,
    /Pipfile$/i,
  ];

  parse(repoName: string, filePath: string, content: string): ParsedDependency[] {
    const lower = filePath.toLowerCase();
    const basename = lower.split("/").pop() || "";

    if (basename.match(/^requirements.*\.txt$/)) {
      return this.parseRequirements(filePath, content);
    }
    if (basename === "pyproject.toml") {
      return this.parsePyprojectToml(filePath, content);
    }
    if (basename === "setup.py") {
      return this.parseSetupPy(filePath, content);
    }
    if (basename === "setup.cfg") {
      return this.parseSetupCfg(filePath, content);
    }
    if (basename === "pipfile") {
      return this.parsePipfile(filePath, content);
    }

    return [];
  }

  private parseRequirements(filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    const isDev = /dev|test/i.test(filePath);

    for (const rawLine of content.split("\n")) {
      const line = rawLine.split("#")[0].trim();
      if (!line || line.startsWith("-") || line.startsWith("--")) continue;

      // Handle: package==version, package>=version, package~=version, package!=version
      const match = line.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*([><=~!]+)\s*(\S+)/);
      if (match) {
        deps.push({
          name: this.normalizeName(match[1]),
          version: match[3],
          ecosystem: Ecosystem.Python,
          scope: isDev ? DependencyScope.Dev : DependencyScope.Runtime,
          sourceFile: filePath,
        });
        continue;
      }

      // Handle: package (no version constraint)
      const nameOnly = line.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*$/);
      if (nameOnly) {
        deps.push({
          name: this.normalizeName(nameOnly[1]),
          version: "*",
          ecosystem: Ecosystem.Python,
          scope: isDev ? DependencyScope.Dev : DependencyScope.Runtime,
          sourceFile: filePath,
        });
      }
    }

    return deps;
  }

  private parsePyprojectToml(filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Extract [project] dependencies array
    const depsMatch = content.match(
      /\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/
    );
    if (depsMatch) {
      const items = this.extractTomlArrayItems(depsMatch[1]);
      for (const item of items) {
        const parsed = this.parseRequirementString(item);
        if (parsed) {
          deps.push({
            ...parsed,
            scope: DependencyScope.Runtime,
            sourceFile: filePath,
          });
        }
      }
    }

    // Extract [project.optional-dependencies] sections
    const optionalRegex =
      /\[project\.optional-dependencies\]\s*\n([\s\S]*?)(?=\n\[|\n*$)/g;
    let optMatch;
    while ((optMatch = optionalRegex.exec(content)) !== null) {
      const section = optMatch[1];
      // Match named arrays: test = ["pytest>=7.0", ...]
      const arrayRegex = /(\w+)\s*=\s*\[([\s\S]*?)\]/g;
      let arrMatch;
      while ((arrMatch = arrayRegex.exec(section)) !== null) {
        const groupName = arrMatch[1].toLowerCase();
        const isTest = groupName === "test" || groupName === "testing" || groupName === "dev";
        const items = this.extractTomlArrayItems(arrMatch[2]);
        for (const item of items) {
          const parsed = this.parseRequirementString(item);
          if (parsed) {
            deps.push({
              ...parsed,
              scope: isTest ? DependencyScope.Dev : DependencyScope.Optional,
              sourceFile: filePath,
            });
          }
        }
      }
    }

    // Extract license from [project]
    const licenseMatch = content.match(
      /\[project\][\s\S]*?license\s*=\s*\{[^}]*text\s*=\s*"([^"]+)"/
    );
    const declaredLicense = licenseMatch ? licenseMatch[1] : undefined;

    if (declaredLicense) {
      for (const dep of deps) {
        if (dep.scope === DependencyScope.Runtime) {
          dep.declaredLicense = declaredLicense;
        }
      }
    }

    return deps;
  }

  private parseSetupPy(filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Extract install_requires list
    const installReqMatch = content.match(
      /install_requires\s*=\s*\[([\s\S]*?)\]/
    );
    if (installReqMatch) {
      const items = this.extractPythonListItems(installReqMatch[1]);
      for (const item of items) {
        const parsed = this.parseRequirementString(item);
        if (parsed) {
          deps.push({
            ...parsed,
            scope: DependencyScope.Runtime,
            sourceFile: filePath,
          });
        }
      }
    }

    // Extract tests_require / extras_require
    const testsReqMatch = content.match(
      /tests_require\s*=\s*\[([\s\S]*?)\]/
    );
    if (testsReqMatch) {
      const items = this.extractPythonListItems(testsReqMatch[1]);
      for (const item of items) {
        const parsed = this.parseRequirementString(item);
        if (parsed) {
          deps.push({
            ...parsed,
            scope: DependencyScope.Test,
            sourceFile: filePath,
          });
        }
      }
    }

    return deps;
  }

  private parseSetupCfg(filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Extract [options] install_requires
    const installReqMatch = content.match(
      /\[options\][\s\S]*?install_requires\s*=\s*\n((?:\s+\S.*\n?)*)/
    );
    if (installReqMatch) {
      const lines = installReqMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parsed = this.parseRequirementString(line);
        if (parsed) {
          deps.push({
            ...parsed,
            scope: DependencyScope.Runtime,
            sourceFile: filePath,
          });
        }
      }
    }

    return deps;
  }

  private parsePipfile(filePath: string, content: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    let currentSection: "packages" | "dev-packages" | null = null;

    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();

      if (line === "[packages]") {
        currentSection = "packages";
        continue;
      }
      if (line === "[dev-packages]") {
        currentSection = "dev-packages";
        continue;
      }
      if (line.startsWith("[")) {
        currentSection = null;
        continue;
      }

      if (!currentSection || !line || line.startsWith("#")) continue;

      // pkg = "==1.2.3" or pkg = "*" or pkg = {version = ">=1.0", extras = ["security"]}
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"$/);
      if (match) {
        const name = this.normalizeName(match[1]);
        const versionSpec = match[2];
        const version = versionSpec === "*" ? "*" : versionSpec.replace(/^[><=~!]+/, "");

        deps.push({
          name,
          version,
          ecosystem: Ecosystem.Python,
          scope: currentSection === "dev-packages" ? DependencyScope.Dev : DependencyScope.Runtime,
          sourceFile: filePath,
        });
      }
    }

    return deps;
  }

  private parseRequirementString(
    raw: string
  ): Omit<ParsedDependency, "scope" | "sourceFile"> | null {
    const cleaned = raw.trim();
    if (!cleaned) return null;

    const match = cleaned.match(/^([a-zA-Z0-9_][a-zA-Z0-9._-]*)\s*(?:[><=~!]+\s*(\S+))?/);
    if (!match) return null;

    return {
      name: this.normalizeName(match[1]),
      version: match[2] || "*",
      ecosystem: Ecosystem.Python,
    };
  }

  private extractTomlArrayItems(raw: string): string[] {
    const items: string[] = [];
    const regex = /"([^"]+)"/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      items.push(match[1]);
    }
    return items;
  }

  private extractPythonListItems(raw: string): string[] {
    const items: string[] = [];
    // Match both single and double quoted strings
    const regex = /["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      items.push(match[1]);
    }
    return items;
  }

  private normalizeName(name: string): string {
    // PEP 503: normalize by lowering case and replacing - or . with _
    return name.toLowerCase().replace(/[-_.]+/g, "-");
  }
}
