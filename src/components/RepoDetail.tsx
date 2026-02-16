import * as React from "react";
import { RepoScanResult, Ecosystem, LicenseCategory } from "@/models/types";
import { useTheme } from "@/utils/theme";
import { ECOSYSTEM_COLORS, LICENSE_CATEGORY_COLORS } from "@/utils/Constants";
import { DependencyTable } from "./DependencyTable";
import { PolicyViolations } from "./PolicyViolations";
import { SbomExport } from "./SbomExport";
import { ViewTab } from "./ControlBar";

interface RepoDetailProps {
  repo: RepoScanResult;
  activeTab: ViewTab;
  searchTerm: string;
  allRepos: RepoScanResult[];
}

export const RepoDetail: React.FC<RepoDetailProps> = ({
  repo,
  activeTab,
  searchTerm,
  allRepos,
}) => {
  const theme = useTheme();

  // Compute stats
  const ecosystemCounts = new Map<Ecosystem, number>();
  const categoryCounts = new Map<LicenseCategory, number>();

  for (const dep of repo.dependencies) {
    ecosystemCounts.set(dep.ecosystem, (ecosystemCounts.get(dep.ecosystem) || 0) + 1);
    categoryCounts.set(dep.licenseCategory, (categoryCounts.get(dep.licenseCategory) || 0) + 1);
  }

  const blockedCount = repo.violations.filter((v) => v.action === "block").length;
  const warnCount = repo.violations.filter((v) => v.action === "warn").length;

  const statBoxStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 4,
    border: `1px solid ${theme.borderDefault}`,
    background: theme.bgSurface,
    minWidth: 100,
    textAlign: "center",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* Summary bar */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          borderBottom: `1px solid ${theme.borderDefault}`,
        }}
      >
        <div style={statBoxStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>
            {repo.dependencies.length}
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>Dependencies</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, color: blockedCount > 0 ? "#f44336" : theme.statGreen }}>
            {blockedCount}
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>Blocked</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, color: warnCount > 0 ? "#ff9800" : theme.statGreen }}>
            {warnCount}
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>Warnings</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>
            {repo.fileCount}
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>Files Scanned</div>
        </div>

        {/* Ecosystem breakdown */}
        <div
          style={{
            ...statBoxStyle,
            display: "flex",
            gap: 8,
            alignItems: "center",
            textAlign: "left",
          }}
        >
          {Array.from(ecosystemCounts.entries()).map(([eco, count]) => (
            <div key={eco} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: ECOSYSTEM_COLORS[eco],
                }}
              />
              <span style={{ fontSize: 11, color: theme.textMuted }}>
                {eco}: {count}
              </span>
            </div>
          ))}
        </div>

        {/* License category breakdown */}
        <div
          style={{
            ...statBoxStyle,
            display: "flex",
            gap: 8,
            alignItems: "center",
            textAlign: "left",
          }}
        >
          {Array.from(categoryCounts.entries()).map(([cat, count]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: LICENSE_CATEGORY_COLORS[cat],
                }}
              />
              <span style={{ fontSize: 11, color: theme.textMuted }}>
                {cat}: {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: "0 16px" }}>
        {activeTab === "dependencies" && (
          <DependencyTable
            dependencies={repo.dependencies}
            searchTerm={searchTerm}
            repoName={repo.repoName}
          />
        )}
        {activeTab === "violations" && (
          <PolicyViolations violations={repo.violations} searchTerm={searchTerm} />
        )}
        {activeTab === "sbom" && (
          <SbomExport repos={allRepos} selectedRepo={repo.repoName} />
        )}
      </div>
    </div>
  );
};
