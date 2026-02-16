import * as React from "react";
import { RepoScanResult, LicenseCategory } from "@/models/types";
import { useTheme } from "@/utils/theme";
import { LICENSE_CATEGORY_COLORS } from "@/utils/Constants";

interface SbomExportProps {
  repos: RepoScanResult[];
  selectedRepo: string | null;
}

export const SbomExport: React.FC<SbomExportProps> = ({ repos, selectedRepo }) => {
  const theme = useTheme();
  const [expandedRepo, setExpandedRepo] = React.useState<string | null>(null);

  const displayRepos = selectedRepo ? repos.filter((r) => r.repoName === selectedRepo) : repos;

  const downloadSbom = (repo: RepoScanResult) => {
    const json = JSON.stringify(repo.sbom, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repo.repoName}-sbom-cyclonedx.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllSboms = () => {
    for (const repo of displayRepos) {
      if (repo.sbom.components.length > 0) {
        downloadSbom(repo);
      }
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: theme.textPrimary }}>
          CycloneDX SBOM Export
        </h3>
        {!selectedRepo && displayRepos.length > 1 && (
          <button
            onClick={downloadAllSboms}
            style={{
              padding: "5px 12px",
              borderRadius: 3,
              border: `1px solid ${theme.borderDefault}`,
              background: theme.btnDefaultBg,
              color: theme.textPrimary,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Download All SBOMs
          </button>
        )}
      </div>

      {displayRepos.map((repo) => {
        const isExpanded = expandedRepo === repo.repoName;
        const categoryCounts = new Map<LicenseCategory, number>();
        for (const dep of repo.dependencies) {
          categoryCounts.set(
            dep.licenseCategory,
            (categoryCounts.get(dep.licenseCategory) || 0) + 1
          );
        }

        return (
          <div
            key={repo.repoName}
            style={{
              border: `1px solid ${theme.borderDefault}`,
              borderRadius: 4,
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                gap: 12,
                background: theme.bgSurface,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{repo.repoName}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      borderRadius: 3,
                      color: "#fff",
                      background: LICENSE_CATEGORY_COLORS[cat],
                    }}
                  >
                    {count}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 11, color: theme.textMuted }}>
                {repo.sbom.components.length} components
              </span>
              <button
                onClick={() => setExpandedRepo(isExpanded ? null : repo.repoName)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 3,
                  border: `1px solid ${theme.borderDefault}`,
                  background: theme.btnDefaultBg,
                  color: theme.textPrimary,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {isExpanded ? "Hide" : "Preview"}
              </button>
              <button
                onClick={() => downloadSbom(repo)}
                disabled={repo.sbom.components.length === 0}
                style={{
                  padding: "3px 8px",
                  borderRadius: 3,
                  border: "none",
                  background:
                    repo.sbom.components.length === 0 ? theme.disabledBg : "#0078d4",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor:
                    repo.sbom.components.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Download JSON
              </button>
            </div>
            {isExpanded && (
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  fontSize: 11,
                  fontFamily: "monospace",
                  background: theme.bgSurfaceAlt,
                  color: theme.textSecondary,
                  maxHeight: 400,
                  overflowY: "auto",
                  borderTop: `1px solid ${theme.borderDefault}`,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(repo.sbom, null, 2)}
              </pre>
            )}
          </div>
        );
      })}

      {displayRepos.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: theme.textMuted }}>
          No repositories with dependencies found.
        </div>
      )}
    </div>
  );
};
