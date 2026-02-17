import * as React from "react";
import { ResolvedDependency, Ecosystem, LicenseCategory, ApprovedPackagesRegistry, ApprovalStatus } from "@/models/types";
import { useTheme } from "@/utils/theme";
import { ECOSYSTEM_COLORS, APPROVAL_STATUS_COLORS } from "@/utils/Constants";
import { LicenseBadge } from "./LicenseBadge";
import { buildApprovalMap } from "@/utils/approvalChecker";

interface DependencyTableProps {
  dependencies: ResolvedDependency[];
  searchTerm: string;
  repoName: string;
  approvalRegistry?: ApprovedPackagesRegistry;
}

type SortKey = "name" | "version" | "ecosystem" | "license" | "scope";
type SortDir = "asc" | "desc";

export const DependencyTable: React.FC<DependencyTableProps> = ({
  dependencies,
  searchTerm,
  repoName,
  approvalRegistry,
}) => {
  const theme = useTheme();
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [filterEcosystem, setFilterEcosystem] = React.useState<Ecosystem | "all">("all");
  const [filterCategory, setFilterCategory] = React.useState<LicenseCategory | "all">("all");
  const [filterApproval, setFilterApproval] = React.useState<ApprovalStatus | "all">("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const approvalMap = React.useMemo(() => {
    if (!approvalRegistry) return null;
    return buildApprovalMap(dependencies, approvalRegistry);
  }, [dependencies, approvalRegistry]);

  const filtered = React.useMemo(() => {
    let result = [...dependencies];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(lower) ||
          d.license.toLowerCase().includes(lower) ||
          d.version.toLowerCase().includes(lower)
      );
    }

    if (filterEcosystem !== "all") {
      result = result.filter((d) => d.ecosystem === filterEcosystem);
    }

    if (filterCategory !== "all") {
      result = result.filter((d) => d.licenseCategory === filterCategory);
    }

    if (filterApproval !== "all" && approvalMap) {
      result = result.filter((d) => {
        const key = `${d.name}::${d.ecosystem}::${d.version}`;
        return approvalMap.get(key) === filterApproval;
      });
    }

    result.sort((a, b) => {
      const aVal = a[sortKey] || "";
      const bVal = b[sortKey] || "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [dependencies, searchTerm, filterEcosystem, filterCategory, filterApproval, approvalMap, sortKey, sortDir]);

  const headerStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 600,
    color: theme.textMuted,
    textTransform: "uppercase",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: `2px solid ${theme.borderDefault}`,
    textAlign: "left",
  };

  const cellStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 12,
    borderBottom: `1px solid ${theme.borderRow}`,
    verticalAlign: "middle",
  };

  const selectStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "3px 6px",
    border: `1px solid ${theme.borderInput}`,
    borderRadius: 3,
    background: theme.bgSurface,
    color: theme.textPrimary,
  };

  const hasApproval = !!approvalMap;
  const colCount = hasApproval ? 7 : 6;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "8px 0", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: theme.textMuted }}>Filter:</span>
        <select
          value={filterEcosystem}
          onChange={(e) => setFilterEcosystem(e.target.value as Ecosystem | "all")}
          style={selectStyle}
        >
          <option value="all">All ecosystems</option>
          {Object.values(Ecosystem).map((eco) => (
            <option key={eco} value={eco}>
              {eco}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as LicenseCategory | "all")}
          style={selectStyle}
        >
          <option value="all">All license types</option>
          {Object.values(LicenseCategory).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {hasApproval && (
          <select
            value={filterApproval}
            onChange={(e) => setFilterApproval(e.target.value as ApprovalStatus | "all")}
            style={selectStyle}
          >
            <option value="all">All approval</option>
            <option value={ApprovalStatus.Approved}>Approved</option>
            <option value={ApprovalStatus.AutoApproved}>Auto-approved</option>
            <option value={ApprovalStatus.Unapproved}>Unapproved</option>
          </select>
        )}
        <span style={{ fontSize: 12, color: theme.textMuted, marginLeft: "auto" }}>
          {filtered.length} of {dependencies.length} dependencies
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headerStyle} onClick={() => handleSort("name")}>
                Package {sortKey === "name" ? (sortDir === "asc" ? "^" : "v") : ""}
              </th>
              <th style={headerStyle} onClick={() => handleSort("version")}>
                Version {sortKey === "version" ? (sortDir === "asc" ? "^" : "v") : ""}
              </th>
              <th style={headerStyle} onClick={() => handleSort("ecosystem")}>
                Ecosystem {sortKey === "ecosystem" ? (sortDir === "asc" ? "^" : "v") : ""}
              </th>
              <th style={headerStyle} onClick={() => handleSort("license")}>
                License {sortKey === "license" ? (sortDir === "asc" ? "^" : "v") : ""}
              </th>
              <th style={headerStyle} onClick={() => handleSort("scope")}>
                Scope {sortKey === "scope" ? (sortDir === "asc" ? "^" : "v") : ""}
              </th>
              <th style={{ ...headerStyle, cursor: "default" }}>Source File</th>
              {hasApproval && (
                <th style={{ ...headerStyle, cursor: "default" }}>Approval</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((dep, idx) => {
              const approvalKey = `${dep.name}::${dep.ecosystem}::${dep.version}`;
              const status = approvalMap?.get(approvalKey) ?? ApprovalStatus.Unapproved;
              return (
                <tr key={`${dep.name}-${dep.ecosystem}-${idx}`}>
                  <td style={{ ...cellStyle, fontFamily: "monospace", fontWeight: 500 }}>
                    {dep.name}
                  </td>
                  <td style={{ ...cellStyle, fontFamily: "monospace" }}>{dep.version}</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#fff",
                        background: ECOSYSTEM_COLORS[dep.ecosystem],
                      }}
                    >
                      {dep.ecosystem}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <LicenseBadge license={dep.license} category={dep.licenseCategory} />
                  </td>
                  <td style={{ ...cellStyle, color: theme.textMuted, fontSize: 11 }}>
                    {dep.scope}
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      color: theme.textMuted,
                      fontSize: 11,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={dep.sourceFile}
                  >
                    {dep.sourceFile}
                  </td>
                  {hasApproval && (
                    <td style={cellStyle}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#fff",
                          background: APPROVAL_STATUS_COLORS[status],
                        }}
                      >
                        {status}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={colCount} style={{ ...cellStyle, textAlign: "center", color: theme.textMuted }}>
                  No dependencies found matching the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
