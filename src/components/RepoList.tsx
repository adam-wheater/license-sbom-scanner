import * as React from "react";
import { RepoScanResult, LicenseCategory } from "@/models/types";
import { useTheme } from "@/utils/theme";
import { LICENSE_CATEGORY_COLORS } from "@/utils/Constants";

interface RepoListProps {
  repos: RepoScanResult[];
  selectedRepo: string | null;
  onSelectRepo: (repoName: string) => void;
}

export const RepoList: React.FC<RepoListProps> = ({ repos, selectedRepo, onSelectRepo }) => {
  const theme = useTheme();

  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        borderRight: `1px solid ${theme.borderDefault}`,
        overflowY: "auto",
        background: theme.bgSurface,
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          fontSize: 11,
          fontWeight: 600,
          color: theme.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          borderBottom: `1px solid ${theme.borderDefault}`,
        }}
      >
        Repositories ({repos.length})
      </div>
      {repos.map((repo) => {
        const isSelected = repo.repoName === selectedRepo;
        const blockedCount = repo.violations.filter((v) => v.action === "block").length;
        const warnCount = repo.violations.filter((v) => v.action === "warn").length;

        // Count license categories for mini breakdown
        const categoryCounts = new Map<LicenseCategory, number>();
        for (const dep of repo.dependencies) {
          categoryCounts.set(dep.licenseCategory, (categoryCounts.get(dep.licenseCategory) || 0) + 1);
        }

        return (
          <div
            key={repo.repoName}
            onClick={() => onSelectRepo(repo.repoName)}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              background: isSelected ? "#0078d4" : "transparent",
              color: isSelected ? "#fff" : theme.textPrimary,
              borderBottom: `1px solid ${theme.borderRow}`,
              transition: "background 0.15s",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{repo.repoName}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ color: isSelected ? "rgba(255,255,255,0.8)" : theme.textMuted }}>
                {repo.dependencies.length} deps
              </span>
              {blockedCount > 0 && (
                <span
                  style={{
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    background: isSelected ? "rgba(244,67,54,0.3)" : "#f44336",
                    color: "#fff",
                  }}
                >
                  {blockedCount} blocked
                </span>
              )}
              {warnCount > 0 && (
                <span
                  style={{
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    background: isSelected ? "rgba(255,152,0,0.3)" : "#ff9800",
                    color: "#fff",
                  }}
                >
                  {warnCount} warn
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
              {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                <div
                  key={cat}
                  title={`${cat}: ${count}`}
                  style={{
                    width: Math.max(4, Math.min(count * 3, 40)),
                    height: 3,
                    borderRadius: 1,
                    background: isSelected
                      ? "rgba(255,255,255,0.5)"
                      : LICENSE_CATEGORY_COLORS[cat],
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
