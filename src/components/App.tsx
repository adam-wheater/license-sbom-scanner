import * as React from "react";
import { FullScanResult, ScanProgress as ScanProgressType, LicenseCategory, Ecosystem } from "@/models/types";
import { LICENSE_CATEGORY_COLORS, ECOSYSTEM_COLORS } from "@/utils/Constants";
import { ScanOrchestrator } from "@/scanning/ScanOrchestrator";
import { usePolicySettings } from "@/hooks/usePolicySettings";
import { useApprovedPackages } from "@/hooks/useApprovedPackages";
import { useTheme } from "@/utils/theme";
import { ControlBar, ViewTab } from "./ControlBar";
import { RepoList } from "./RepoList";
import { RepoDetail } from "./RepoDetail";
import { ScanProgress } from "./ScanProgress";
import { PolicyViolations } from "./PolicyViolations";
import { DependencyTable } from "./DependencyTable";
import { SbomExport } from "./SbomExport";
import { PolicySettings } from "./PolicySettings";
import { LicenseGuide } from "./LicenseGuide";
import { ApprovedPackagesSettings } from "./ApprovedPackagesSettings";

// ErrorBoundary class component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <h2 style={{ color: "#c62828" }}>Something went wrong</h2>
          <p style={{ color: "#666" }}>{this.state.error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background: "#0078d4",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const theme = useTheme();
  const {
    loading: policyLoading,
    policy,
    savePolicy,
    resetToDefaults,
  } = usePolicySettings();
  const {
    loading: approvedLoading,
    registry: approvedRegistry,
    saveRegistry: saveApprovedRegistry,
    resetToDefaults: resetApprovedDefaults,
  } = useApprovedPackages();

  const [scanResult, setScanResult] = React.useState<FullScanResult | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [progress, setProgress] = React.useState<ScanProgressType | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<ViewTab>("overview");
  const [searchTerm, setSearchTerm] = React.useState("");

  const scanGenRef = React.useRef(0);

  const handleScan = React.useCallback(async () => {
    const gen = ++scanGenRef.current;
    setScanning(true);
    setScanError(null);
    setProgress(null);
    setScanResult(null);
    setSelectedRepo(null);
    setActiveTab("overview");

    try {
      const orchestrator = new ScanOrchestrator(policy, (p) => {
        if (gen === scanGenRef.current) {
          setProgress(p);
        }
      });
      const result = await orchestrator.scan();

      if (gen === scanGenRef.current) {
        setScanResult(result);
        setActiveTab("overview");
      }
    } catch (err) {
      if (gen === scanGenRef.current) {
        setScanError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (gen === scanGenRef.current) {
        setScanning(false);
      }
    }
  }, [policy]);

  const selectedRepoResult = scanResult?.repos.find((r) => r.repoName === selectedRepo) ?? null;

  // Aggregate all violations and dependencies across repos for the "all" views
  const allViolations = React.useMemo(
    () => scanResult?.repos.flatMap((r) => r.violations) ?? [],
    [scanResult]
  );
  const allDependencies = React.useMemo(
    () => scanResult?.repos.flatMap((r) => r.dependencies) ?? [],
    [scanResult]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        color: theme.textPrimary,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${theme.borderDefault}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>License & SBOM Scanner</h1>
        {scanResult && (
          <span style={{ fontSize: 12, color: theme.textMuted }}>
            Scanned {scanResult.repos.length} repos in{" "}
            {(scanResult.scanDurationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Control bar */}
      <ControlBar
        scanning={scanning}
        onScan={handleScan}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        hasResults={!!scanResult}
        totalDeps={scanResult?.totalDependencies ?? 0}
        totalViolations={scanResult?.totalViolations ?? 0}
      />

      {/* Progress */}
      {scanning && progress && <ScanProgress progress={progress} />}

      {/* Error */}
      {scanError && (
        <div
          style={{
            padding: "8px 16px",
            background: theme.errorBg,
            color: theme.errorText,
            fontSize: 13,
          }}
        >
          Scan failed: {scanError}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {activeTab === "licenses" && <LicenseGuide />}

        {activeTab !== "licenses" && !scanResult && !scanning && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              color: theme.textMuted,
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.3 }}>&#9881;</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>License & SBOM Compliance Scanner</div>
            <div style={{ fontSize: 13, maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
              Scan all repositories in this project for dependency licenses, policy violations, and
              generate CycloneDX SBOM documents. Click "Scan All Repos" to begin.
            </div>
          </div>
        )}

        {scanResult && activeTab === "settings" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <PolicySettings
              policy={policy}
              onSave={savePolicy}
              onReset={resetToDefaults}
              loading={policyLoading}
            />
            <ApprovedPackagesSettings
              registry={approvedRegistry}
              onSave={saveApprovedRegistry}
              onReset={resetApprovedDefaults}
              loading={approvedLoading}
            />
          </div>
        )}

        {scanResult && activeTab === "overview" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <OverviewPanel result={scanResult} />
          </div>
        )}

        {scanResult && (activeTab === "dependencies" || activeTab === "violations" || activeTab === "sbom") && (
          <>
            <RepoList
              repos={scanResult.repos}
              selectedRepo={selectedRepo}
              onSelectRepo={setSelectedRepo}
            />
            {selectedRepoResult ? (
              <RepoDetail
                repo={selectedRepoResult}
                activeTab={activeTab}
                searchTerm={searchTerm}
                allRepos={scanResult.repos}
                approvalRegistry={approvedRegistry}
              />
            ) : (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {activeTab === "dependencies" && (
                  <div style={{ padding: "0 16px" }}>
                    <DependencyTable
                      dependencies={allDependencies}
                      searchTerm={searchTerm}
                      repoName="All Repositories"
                      approvalRegistry={approvedRegistry}
                    />
                  </div>
                )}
                {activeTab === "violations" && (
                  <PolicyViolations violations={allViolations} searchTerm={searchTerm} />
                )}
                {activeTab === "sbom" && (
                  <SbomExport repos={scanResult.repos} selectedRepo={null} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Overview panel showing aggregate stats
function OverviewPanel({ result }: { result: FullScanResult }) {
  const theme = useTheme();

  // Aggregate stats
  const ecosystemTotals = new Map<Ecosystem, number>();
  const categoryTotals = new Map<LicenseCategory, number>();
  const blockedTotal = result.repos.reduce(
    (sum, r) => sum + r.violations.filter((v) => v.action === "block").length,
    0
  );
  const warnTotal = result.repos.reduce(
    (sum, r) => sum + r.violations.filter((v) => v.action === "warn").length,
    0
  );

  for (const repo of result.repos) {
    for (const dep of repo.dependencies) {
      ecosystemTotals.set(dep.ecosystem, (ecosystemTotals.get(dep.ecosystem) || 0) + 1);
      categoryTotals.set(dep.licenseCategory, (categoryTotals.get(dep.licenseCategory) || 0) + 1);
    }
  }

  const statCardStyle: React.CSSProperties = {
    padding: "16px 20px",
    borderRadius: 6,
    border: `1px solid ${theme.borderDefault}`,
    background: theme.bgSurface,
    minWidth: 140,
    textAlign: "center",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.textPrimary }}>
            {result.repos.length}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>Repos Scanned</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.textPrimary }}>
            {result.totalDependencies}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>Total Dependencies</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: blockedTotal > 0 ? "#f44336" : theme.statGreen }}>
            {blockedTotal}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>Policy Blocked</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: warnTotal > 0 ? "#ff9800" : theme.statGreen }}>
            {warnTotal}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>Policy Warnings</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.textPrimary }}>
            {(result.scanDurationMs / 1000).toFixed(1)}s
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>Scan Duration</div>
        </div>
      </div>

      {/* Ecosystem breakdown */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: theme.textPrimary }}>
          Dependencies by Ecosystem
        </h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.from(ecosystemTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([eco, count]) => (
              <div
                key={eco}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: `1px solid ${theme.borderDefault}`,
                  background: theme.bgSurface,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: ECOSYSTEM_COLORS[eco],
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{eco}</span>
                <span style={{ fontSize: 12, color: theme.textMuted }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* License category breakdown */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: theme.textPrimary }}>
          Dependencies by License Category
        </h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: `1px solid ${theme.borderDefault}`,
                  background: theme.bgSurface,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: LICENSE_CATEGORY_COLORS[cat],
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>
                  {cat}
                </span>
                <span style={{ fontSize: 12, color: theme.textMuted }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Top repos by violations */}
      {result.totalViolations > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: theme.textPrimary }}>
            Repos with Most Violations
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {result.repos
              .filter((r) => r.violations.length > 0)
              .slice(0, 10)
              .map((repo) => {
                const blocked = repo.violations.filter((v) => v.action === "block").length;
                const warned = repo.violations.filter((v) => v.action === "warn").length;
                return (
                  <div
                    key={repo.repoName}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 4,
                      border: `1px solid ${theme.borderDefault}`,
                      background: theme.bgSurface,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                      {repo.repoName}
                    </span>
                    {blocked > 0 && (
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#fff",
                          background: "#f44336",
                        }}
                      >
                        {blocked} blocked
                      </span>
                    )}
                    {warned > 0 && (
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#fff",
                          background: "#ff9800",
                        }}
                      >
                        {warned} warnings
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: theme.textMuted }}>
                      {repo.dependencies.length} deps
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
