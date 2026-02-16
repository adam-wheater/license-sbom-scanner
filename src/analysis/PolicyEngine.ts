import {
  ResolvedDependency,
  LicensePolicy,
  PolicyViolation,
  PolicyAction,
  LicenseCategory,
} from "@/models/types";
import { DEFAULT_POLICY } from "@/models/LicenseRegistry";

export class PolicyEngine {
  private policy: LicensePolicy;

  constructor(policy?: LicensePolicy) {
    this.policy = policy ?? DEFAULT_POLICY;
  }

  setPolicy(policy: LicensePolicy): void {
    this.policy = policy;
  }

  evaluate(repoName: string, deps: ResolvedDependency[]): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const dep of deps) {
      // Skip excluded packages
      if (
        this.policy.excludedPackages.some(
          (p) => dep.name.toLowerCase() === p.toLowerCase()
        )
      ) {
        continue;
      }

      // Check specific license overrides first
      const override = this.policy.specificOverrides.find(
        (o) => o.licenseId.toLowerCase() === dep.license.toLowerCase()
      );

      const action = override
        ? override.action
        : this.policy.categoryDefaults[dep.licenseCategory];

      if (action === PolicyAction.Warn || action === PolicyAction.Block) {
        violations.push({
          dependency: dep,
          action,
          reason: this.buildReason(dep, action),
          repoName,
        });
      }
    }

    return violations;
  }

  private buildReason(dep: ResolvedDependency, action: PolicyAction): string {
    const verb = action === PolicyAction.Block ? "blocked" : "flagged";

    if (dep.licenseCategory === LicenseCategory.Unknown) {
      return `Unknown license for ${dep.name}@${dep.version} — ${verb} by policy`;
    }

    return `${this.formatCategory(dep.licenseCategory)} license ${dep.license} on ${dep.name}@${dep.version} — ${verb} by policy`;
  }

  private formatCategory(category: LicenseCategory): string {
    switch (category) {
      case LicenseCategory.Permissive:
        return "Permissive";
      case LicenseCategory.WeakCopyleft:
        return "Weak copyleft";
      case LicenseCategory.StrongCopyleft:
        return "Strong copyleft";
      case LicenseCategory.Proprietary:
        return "Proprietary";
      case LicenseCategory.Unknown:
        return "Unknown";
    }
  }
}
