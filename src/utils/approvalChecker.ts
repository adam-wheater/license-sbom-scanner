import {
  ResolvedDependency,
  ApprovedPackagesRegistry,
  ApprovalStatus,
} from "@/models/types";

/**
 * Converts a user-facing glob pattern (e.g. "Microsoft.*") to a RegExp.
 * Only supports * as wildcard (matches any sequence of characters).
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const withWildcards = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${withWildcards}$`, "i");
}

export function getApprovalStatus(
  dep: ResolvedDependency,
  registry: ApprovedPackagesRegistry
): ApprovalStatus {
  const explicit = registry.packages.find(
    (p) =>
      p.ecosystem === dep.ecosystem &&
      p.name.toLowerCase() === dep.name.toLowerCase()
  );
  if (explicit) return ApprovalStatus.Approved;

  const ruleMatch = registry.autoApprovalRules.find(
    (r) =>
      r.ecosystem === dep.ecosystem && patternToRegex(r.pattern).test(dep.name)
  );
  if (ruleMatch) return ApprovalStatus.AutoApproved;

  return ApprovalStatus.Unapproved;
}

/**
 * Batch version that pre-compiles rule regexes and builds a Set for O(1) explicit lookups.
 * Returns a Map keyed by "name::ecosystem::version".
 */
export function buildApprovalMap(
  deps: ResolvedDependency[],
  registry: ApprovedPackagesRegistry
): Map<string, ApprovalStatus> {
  const compiledRules = registry.autoApprovalRules.map((r) => ({
    ...r,
    regex: patternToRegex(r.pattern),
  }));

  const explicitSet = new Set(
    registry.packages.map((p) => `${p.ecosystem}::${p.name.toLowerCase()}`)
  );

  const map = new Map<string, ApprovalStatus>();
  for (const dep of deps) {
    const key = `${dep.name}::${dep.ecosystem}::${dep.version}`;
    const explicitKey = `${dep.ecosystem}::${dep.name.toLowerCase()}`;

    if (explicitSet.has(explicitKey)) {
      map.set(key, ApprovalStatus.Approved);
    } else {
      const rule = compiledRules.find(
        (r) => r.ecosystem === dep.ecosystem && r.regex.test(dep.name)
      );
      map.set(key, rule ? ApprovalStatus.AutoApproved : ApprovalStatus.Unapproved);
    }
  }
  return map;
}
