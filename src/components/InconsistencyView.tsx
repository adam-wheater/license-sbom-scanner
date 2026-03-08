import * as React from "react";
import { VersionInconsistency } from "@/models/types";
import { useTheme } from "@/utils/theme";

function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa && !pb) return a.localeCompare(b);
  if (!pa) return 1;
  if (!pb) return -1;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

interface InconsistencyViewProps {
  inconsistencies: VersionInconsistency[];
}

export const InconsistencyView: React.FC<InconsistencyViewProps> = ({ inconsistencies }) => {
  const theme = useTheme();
  const [searchFilter, setSearchFilter] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!searchFilter) return inconsistencies;
    const lower = searchFilter.toLowerCase();
    return inconsistencies.filter(
      (inc) =>
        inc.packageName.toLowerCase().includes(lower) ||
        inc.ecosystem.toLowerCase().includes(lower) ||
        inc.entries.some(
          (e) => e.repoName.toLowerCase().includes(lower) || e.version.toLowerCase().includes(lower)
        )
    );
  }, [inconsistencies, searchFilter]);

  const inputStyle: React.CSSProperties = {
    padding: "5px 10px",
    border: `1px solid ${theme.borderInput}`,
    borderRadius: 3,
    fontSize: 12,
    background: theme.bgSurface,
    color: theme.textPrimary,
    width: 260,
    outline: "none",
  };

  const majorBadgeStyle: React.CSSProperties = {
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
    color: "#fff",
    background: "#f44336",
  };

  const minorBadgeStyle: React.CSSProperties = {
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
    color: "#fff",
    background: "#ff9800",
  };

  if (inconsistencies.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: theme.textMuted }}>
        No version inconsistencies detected across repositories.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
          Version Inconsistencies
        </h3>
        <span style={{ fontSize: 12, color: theme.textMuted }}>
          {filtered.length} of {inconsistencies.length} packages
        </span>
        <input
          type="text"
          placeholder="Filter by package, ecosystem, or repo..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ ...inputStyle, marginLeft: "auto" }}
        />
      </div>

      {filtered.map((inc) => {
        // Group entries by version so we can show which repos share the same version
        const versionToRepos = new Map<string, string[]>();
        for (const entry of inc.entries) {
          if (!versionToRepos.has(entry.version)) {
            versionToRepos.set(entry.version, []);
          }
          versionToRepos.get(entry.version)!.push(entry.repoName);
        }

        return (
          <div
            key={`${inc.ecosystem}:${inc.packageName}`}
            style={{
              border: `1px solid ${theme.borderDefault}`,
              borderRadius: 4,
              marginBottom: 8,
              overflow: "hidden",
              background: theme.bgSurface,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                gap: 8,
                borderBottom: `1px solid ${theme.borderRow}`,
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.textPrimary,
                }}
              >
                {inc.packageName}
              </span>
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#fff",
                  background: "#607d8b",
                }}
              >
                {inc.ecosystem}
              </span>
              <span style={inc.hasMajorDifference ? majorBadgeStyle : minorBadgeStyle}>
                {inc.hasMajorDifference ? "Major diff" : "Minor diff"}
              </span>
              <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: "auto" }}>
                {versionToRepos.size} versions across {inc.entries.length} repos
              </span>
            </div>
            <div style={{ padding: "6px 12px" }}>
              {Array.from(versionToRepos.entries())
                .sort(([a], [b]) => compareSemver(a, b))
                .map(([version, repos]) => (
                  <div
                    key={version}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      padding: "4px 0",
                      borderBottom: `1px solid ${theme.borderRow}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        fontWeight: 500,
                        color: theme.textPrimary,
                        minWidth: 80,
                      }}
                    >
                      {version}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {repos.map((repo) => (
                        <span
                          key={repo}
                          style={{
                            padding: "1px 6px",
                            borderRadius: 3,
                            fontSize: 11,
                            background: theme.bgSurfaceAlt,
                            color: theme.textSecondary,
                            border: `1px solid ${theme.borderDefault}`,
                          }}
                        >
                          {repo}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: theme.textMuted }}>
          No inconsistencies match the current filter.
        </div>
      )}
    </div>
  );
};
