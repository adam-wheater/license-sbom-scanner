import { Ecosystem, LicenseCategory, PolicyAction, FreshnessStatus, ApprovalStatus } from "@/models/types";

// File patterns for dependency file discovery
export const DEPENDENCY_FILE_PATTERNS: RegExp[] = [
  // NuGet
  /\.csproj$/i,
  /packages\.config$/i,
  /Directory\.Packages\.props$/i,
  /\.nuspec$/i,
  // npm
  /package\.json$/i,
  /package-lock\.json$/i,
  // Go
  /go\.mod$/i,
  // Python
  /requirements.*\.txt$/i,
  /pyproject\.toml$/i,
  /setup\.py$/i,
  /setup\.cfg$/i,
  /Pipfile$/i,
  // Maven
  /pom\.xml$/i,
];

// Paths to skip during file discovery
export const SKIP_PATTERNS: RegExp[] = [
  /node_modules\//i,
  /vendor\//i,
  /\.git\//i,
  /dist\//i,
  /bin\//i,
  /obj\//i,
  /\.vs\//i,
  /packages\//i,
  /TestResults\//i,
];

// Concurrency limits
export const MAX_CONCURRENT_REPOS = 5;
export const MAX_CONCURRENT_FILES = 10;

// Max file size to process (1 MB)
export const MAX_FILE_SIZE = 1024 * 1024;

// License category colors
export const LICENSE_CATEGORY_COLORS: Record<LicenseCategory, string> = {
  [LicenseCategory.Permissive]: "#4caf50",
  [LicenseCategory.WeakCopyleft]: "#ff9800",
  [LicenseCategory.StrongCopyleft]: "#f44336",
  [LicenseCategory.Proprietary]: "#9c27b0",
  [LicenseCategory.Unknown]: "#9e9e9e",
};

// Policy action colors
export const POLICY_ACTION_COLORS: Record<PolicyAction, string> = {
  [PolicyAction.Allow]: "#4caf50",
  [PolicyAction.Warn]: "#ff9800",
  [PolicyAction.Block]: "#f44336",
};

// Ecosystem colors
export const ECOSYSTEM_COLORS: Record<Ecosystem, string> = {
  [Ecosystem.NuGet]: "#004880",
  [Ecosystem.Npm]: "#CB3837",
  [Ecosystem.Go]: "#00ADD8",
  [Ecosystem.Python]: "#3776AB",
  [Ecosystem.Maven]: "#C71A36",
};

// Freshness colors
export const FRESHNESS_COLORS: Record<FreshnessStatus, string> = {
  [FreshnessStatus.Current]: "#4caf50",
  [FreshnessStatus.MinorBehind]: "#ff9800",
  [FreshnessStatus.MajorBehind]: "#f44336",
  [FreshnessStatus.Unknown]: "#9e9e9e",
};

// Settings persistence
export const POLICY_SETTINGS_COLLECTION = "ComplianceScannerSettings";
export const POLICY_DOC_ID = "license-policy";
export const SETTINGS_VERSION = 1;
export const APPROVED_PACKAGES_DOC_ID = "approved-packages";
export const APPROVED_PACKAGES_VERSION = 1;

// Approval status colors
export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  [ApprovalStatus.Approved]: "#4caf50",
  [ApprovalStatus.AutoApproved]: "#2196f3",
  [ApprovalStatus.Unapproved]: "#9e9e9e",
};
