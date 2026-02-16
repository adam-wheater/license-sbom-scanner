import {
  ResolvedDependency,
  SbomDocument,
  SbomComponent,
  DependencyScope,
  Ecosystem,
} from "@/models/types";

export class SbomGenerator {
  generate(repoName: string, deps: ResolvedDependency[]): SbomDocument {
    return {
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      serialNumber: `urn:uuid:${this.generateUuid()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ name: "license-sbom-scanner", version: "1.0.0" }],
        component: { type: "application", name: repoName },
      },
      components: deps.map((dep) => this.toComponent(dep)),
    };
  }

  private toComponent(dep: ResolvedDependency): SbomComponent {
    return {
      type: "library",
      name: dep.name,
      version: dep.version,
      purl: this.buildPurl(dep),
      licenses:
        dep.license !== "Unknown" ? [{ license: { id: dep.license } }] : [],
      scope:
        dep.scope === DependencyScope.Dev || dep.scope === DependencyScope.Test
          ? "optional"
          : "required",
      ecosystem: dep.ecosystem,
    };
  }

  buildPurl(dep: ResolvedDependency): string {
    const version = encodeURIComponent(dep.version);

    switch (dep.ecosystem) {
      case Ecosystem.NuGet:
        return `pkg:nuget/${encodeURIComponent(dep.name)}@${version}`;

      case Ecosystem.Npm:
        if (dep.name.startsWith("@")) {
          return `pkg:npm/${encodeURIComponent(dep.name)}@${version}`;
        }
        return `pkg:npm/${dep.name}@${version}`;

      case Ecosystem.Go:
        return `pkg:golang/${dep.name}@${version}`;

      case Ecosystem.Python:
        return `pkg:pypi/${dep.name}@${version}`;

      case Ecosystem.Maven: {
        const parts = dep.name.split(":");
        if (parts.length === 2) {
          return `pkg:maven/${parts[0]}/${parts[1]}@${version}`;
        }
        return `pkg:maven/${dep.name}@${version}`;
      }

      default:
        return `pkg:generic/${dep.name}@${version}`;
    }
  }

  private generateUuid(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback UUID v4 generation
    const bytes = new Uint8Array(16);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
