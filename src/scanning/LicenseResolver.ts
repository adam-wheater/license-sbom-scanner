import { ParsedDependency, ResolvedDependency, LicenseCategory } from "@/models/types";
import { KNOWN_LICENSES, LICENSE_CATEGORIES } from "@/models/LicenseRegistry";

export class LicenseResolver {
  resolve(deps: ParsedDependency[]): ResolvedDependency[] {
    return deps.map((dep) => {
      const license = this.resolveLicense(dep);
      const licenseCategory = this.categorize(license);
      return { ...dep, license, licenseCategory };
    });
  }

  private resolveLicense(dep: ParsedDependency): string {
    // Tier 1: declared license from file metadata
    if (dep.declaredLicense) {
      return this.normalizeSpdx(dep.declaredLicense);
    }

    // Tier 2: known registry lookup
    const ecosystemMap = KNOWN_LICENSES[dep.ecosystem];
    if (ecosystemMap) {
      const key = dep.name.toLowerCase();
      const known = ecosystemMap[key];
      if (known) return known;
    }

    // Tier 3: unknown
    return "Unknown";
  }

  private categorize(license: string): LicenseCategory {
    if (license === "Unknown") return LicenseCategory.Unknown;
    return LICENSE_CATEGORIES[license] ?? LicenseCategory.Unknown;
  }

  private normalizeSpdx(raw: string): string {
    const trimmed = raw.trim();

    // Already an SPDX ID?
    if (LICENSE_CATEGORIES[trimmed]) return trimmed;

    const lower = trimmed.toLowerCase();

    // Common variations
    if (lower === "mit" || lower === "mit license") return "MIT";
    if (lower.includes("apache") && lower.includes("2")) return "Apache-2.0";
    if (lower === "bsd-3-clause" || lower === "bsd 3-clause" || lower === "new bsd")
      return "BSD-3-Clause";
    if (lower === "bsd-2-clause" || lower === "bsd 2-clause" || lower === "simplified bsd")
      return "BSD-2-Clause";
    if (lower === "isc" || lower === "isc license") return "ISC";
    if (lower === "unlicense" || lower === "the unlicense") return "Unlicense";
    if (lower.includes("lgpl") && lower.includes("3")) return "LGPL-3.0-only";
    if (lower.includes("lgpl") && lower.includes("2")) return "LGPL-2.1-only";
    if (lower.includes("agpl") && lower.includes("3")) return "AGPL-3.0-only";
    if (lower.includes("gpl") && lower.includes("3")) return "GPL-3.0-only";
    if (lower.includes("gpl") && lower.includes("2")) return "GPL-2.0-only";
    if (lower.includes("mozilla") || lower.includes("mpl-2")) return "MPL-2.0";
    if (lower.includes("eclipse") && lower.includes("2")) return "EPL-2.0";
    if (lower.includes("eclipse") || lower.includes("epl")) return "EPL-1.0";
    if (lower === "cc0-1.0" || lower === "cc0" || lower.includes("creative commons zero"))
      return "CC0-1.0";

    return trimmed;
  }
}
