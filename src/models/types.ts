// === Enums ===

export enum Ecosystem {
  NuGet = "nuget",
  Npm = "npm",
  Go = "go",
  Python = "python",
  Maven = "maven",
}

export enum DependencyScope {
  Runtime = "runtime",
  Dev = "dev",
  Peer = "peer",
  Optional = "optional",
  Test = "test",
}

export enum LicenseCategory {
  Permissive = "permissive",
  WeakCopyleft = "weak-copyleft",
  StrongCopyleft = "strong-copyleft",
  Proprietary = "proprietary",
  Unknown = "unknown",
}

export enum PolicyAction {
  Allow = "allow",
  Warn = "warn",
  Block = "block",
}

export enum FreshnessStatus {
  Current = "current",
  MinorBehind = "minor-behind",
  MajorBehind = "major-behind",
  Unknown = "unknown",
}

// === Parser Output ===

export interface ParsedDependency {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  scope: DependencyScope;
  sourceFile: string;
  declaredLicense?: string;
}

// === License Resolution ===

export interface ResolvedDependency extends ParsedDependency {
  license: string;
  licenseCategory: LicenseCategory;
}

// === Policy ===

export interface LicensePolicy {
  categoryDefaults: Record<LicenseCategory, PolicyAction>;
  specificOverrides: LicenseOverride[];
  excludedPackages: string[];
}

export interface LicenseOverride {
  licenseId: string;
  action: PolicyAction;
}

export interface PolicyViolation {
  dependency: ResolvedDependency;
  action: PolicyAction;
  reason: string;
  repoName: string;
}

// === Freshness ===

export interface FreshnessResult {
  dependency: ResolvedDependency;
  status: FreshnessStatus;
  currentVersion: string;
  latestHint?: string;
  repoName: string;
}

// === SBOM ===

export interface SbomComponent {
  type: "library";
  name: string;
  version: string;
  purl: string;
  licenses: { license: { id: string } }[];
  scope: "required" | "optional";
  ecosystem: Ecosystem;
}

export interface SbomDocument {
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: { name: string; version: string }[];
    component: { type: string; name: string };
  };
  components: SbomComponent[];
}

// === Scan Results ===

export interface RepoScanResult {
  repoName: string;
  repoId: string;
  dependencies: ResolvedDependency[];
  violations: PolicyViolation[];
  freshnessResults: FreshnessResult[];
  sbom: SbomDocument;
  scannedAt: Date;
  fileCount: number;
}

export interface ScanProgress {
  phase: "discovery" | "scanning" | "resolving" | "analyzing" | "complete";
  reposTotal: number;
  reposCompleted: number;
  currentRepo: string;
  message: string;
  failedRepos?: string[];
}

export interface FullScanResult {
  repos: RepoScanResult[];
  allRepoNames: string[];
  totalDependencies: number;
  totalViolations: number;
  scanDurationMs: number;
}

// === Settings Persistence ===

export interface PolicyDocument {
  id: string;
  policy: LicensePolicy;
  version: number;
  __etag?: string;
}
