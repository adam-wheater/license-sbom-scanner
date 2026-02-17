import * as React from "react";
import { LicenseCategory, PolicyAction } from "@/models/types";
import { LICENSE_CATEGORIES } from "@/models/LicenseRegistry";
import { LICENSE_CATEGORY_COLORS, POLICY_ACTION_COLORS } from "@/utils/Constants";
import { useTheme } from "@/utils/theme";

interface LicenseInfo {
  name: string;
  summary: string;
}

const LICENSE_INFO: Record<string, LicenseInfo> = {
  MIT: {
    name: "MIT License",
    summary: "Very permissive. Allows commercial use, modification, and distribution with minimal restrictions — just keep the copyright notice.",
  },
  "MIT-CMU": {
    name: "MIT CMU License",
    summary: "MIT variant from Carnegie Mellon. Same permissive terms as MIT with minor wording differences.",
  },
  "Apache-2.0": {
    name: "Apache License 2.0",
    summary: "Permissive with patent grant. Allows commercial use; requires preserving notices and stating changes. Includes explicit patent license.",
  },
  "BSD-2-Clause": {
    name: "BSD 2-Clause (Simplified)",
    summary: "Permissive. Allows commercial use and redistribution with two conditions: retain copyright notice and disclaimer.",
  },
  "BSD-3-Clause": {
    name: "BSD 3-Clause (New/Revised)",
    summary: "Permissive. Like BSD-2-Clause plus a clause preventing use of the author's name for endorsement without permission.",
  },
  ISC: {
    name: "ISC License",
    summary: "Functionally equivalent to MIT/BSD-2-Clause. Very permissive, allows commercial use with attribution.",
  },
  Unlicense: {
    name: "The Unlicense",
    summary: "Public domain dedication. No conditions whatsoever — code can be used for any purpose.",
  },
  "CC0-1.0": {
    name: "Creative Commons Zero 1.0",
    summary: "Public domain dedication. Waives all copyright worldwide, no conditions for use.",
  },
  "0BSD": {
    name: "Zero-Clause BSD",
    summary: "The most permissive license. No requirements at all — not even attribution.",
  },
  Zlib: {
    name: "zlib License",
    summary: "Permissive. Allows commercial use; requires not misrepresenting authorship and marking altered versions.",
  },
  "BSL-1.0": {
    name: "Boost Software License 1.0",
    summary: "Permissive. Allows commercial use; attribution required only in source distributions, not binaries.",
  },
  PostgreSQL: {
    name: "PostgreSQL License",
    summary: "Permissive, similar to MIT/BSD. Allows any use with copyright notice retention.",
  },
  "PSF-2.0": {
    name: "Python Software Foundation License 2.0",
    summary: "Permissive. Allows commercial use and redistribution with attribution to the Python Software Foundation.",
  },
  "Artistic-2.0": {
    name: "Artistic License 2.0",
    summary: "Permissive. Allows commercial use; modified versions must be clearly marked or distributed under different terms.",
  },
  "MS-PL": {
    name: "Microsoft Public License",
    summary: "Permissive. Allows commercial use, modification, and redistribution. No copyleft requirement.",
  },
  WTFPL: {
    name: "Do What The F*ck You Want To Public License",
    summary: "Essentially public domain. No restrictions on use, modification, or distribution.",
  },
  "BlueOak-1.0.0": {
    name: "Blue Oak Model License 1.0",
    summary: "Modern permissive license. Allows any use with attribution; written in plain language for clarity.",
  },
  "LGPL-2.1-only": {
    name: "GNU Lesser General Public License v2.1",
    summary: "Weak copyleft. Linking to the library is allowed in proprietary software, but modifications to the library itself must be shared.",
  },
  "LGPL-2.1-or-later": {
    name: "GNU LGPL v2.1 or later",
    summary: "Same as LGPL-2.1 with the option to use any later LGPL version. Modifications to the library must be shared.",
  },
  "LGPL-3.0-only": {
    name: "GNU Lesser General Public License v3.0",
    summary: "Weak copyleft. Proprietary software may link to the library, but changes to the library must be released under LGPL.",
  },
  "LGPL-3.0-or-later": {
    name: "GNU LGPL v3.0 or later",
    summary: "Same as LGPL-3.0 with the option to adopt any later version. Library modifications must be shared.",
  },
  "MPL-2.0": {
    name: "Mozilla Public License 2.0",
    summary: "Weak copyleft at the file level. Modified files must stay MPL-2.0, but you can combine with proprietary code in larger works.",
  },
  "EPL-1.0": {
    name: "Eclipse Public License 1.0",
    summary: "Weak copyleft. Modifications must be shared under EPL; can be combined with proprietary code in larger products.",
  },
  "EPL-2.0": {
    name: "Eclipse Public License 2.0",
    summary: "Weak copyleft. Like EPL-1.0 with improved compatibility; allows secondary licensing under GPL-2.0.",
  },
  "CDDL-1.0": {
    name: "Common Development and Distribution License 1.0",
    summary: "Weak copyleft at the file level. Modified files must stay CDDL; can combine with proprietary code.",
  },
  "CDDL-1.1": {
    name: "Common Development and Distribution License 1.1",
    summary: "Updated CDDL with minor clarifications. Same file-level copyleft as CDDL-1.0.",
  },
  "CPL-1.0": {
    name: "Common Public License 1.0",
    summary: "Weak copyleft (predecessor to EPL). Modifications must be shared; includes patent retaliation clause.",
  },
  "MS-RL": {
    name: "Microsoft Reciprocal License",
    summary: "Weak copyleft. Source files containing licensed code must remain under MS-RL; other files can be proprietary.",
  },
  "GPL-2.0-only": {
    name: "GNU General Public License v2.0",
    summary: "Strong copyleft. Any distributed derivative work must also be licensed under GPL-2.0. Commercial use is allowed but source must be provided.",
  },
  "GPL-2.0-or-later": {
    name: "GNU GPL v2.0 or later",
    summary: "Same as GPL-2.0 with the option to use any later GPL version. All derivative works must be open source.",
  },
  "GPL-3.0-only": {
    name: "GNU General Public License v3.0",
    summary: "Strong copyleft. Derivative works must be GPL-3.0. Adds patent protection and anti-tivoization clauses over GPL-2.0.",
  },
  "GPL-3.0-or-later": {
    name: "GNU GPL v3.0 or later",
    summary: "Same as GPL-3.0 with the option to adopt future versions. All derivative works must remain open source.",
  },
  "AGPL-3.0-only": {
    name: "GNU Affero General Public License v3.0",
    summary: "Strongest copyleft. Like GPL-3.0 but also requires sharing source if software is accessed over a network (e.g., SaaS).",
  },
  "AGPL-3.0-or-later": {
    name: "GNU AGPL v3.0 or later",
    summary: "Same as AGPL-3.0 with future version option. Network use triggers source-sharing requirement.",
  },
  "SSPL-1.0": {
    name: "Server Side Public License v1.0",
    summary: "Strong copyleft for services. If you offer the software as a service, you must release your entire service stack's source code.",
  },
  "OSL-3.0": {
    name: "Open Software License 3.0",
    summary: "Strong copyleft with patent grant. All derivative works must be open source; includes network-use trigger similar to AGPL.",
  },
  "EUPL-1.2": {
    name: "European Union Public License 1.2",
    summary: "Strong copyleft from the EU. Derivative works must be shared; compatible with GPL, LGPL, AGPL, and other EU licenses.",
  },
  "RPL-1.5": {
    name: "Reciprocal Public License 1.5",
    summary: "Restrictive reciprocal license. All derivative works and deployed modifications must be publicly shared, even internal ones.",
  },
  "Polyform-Noncommercial-1.0.0": {
    name: "PolyForm Noncommercial License 1.0.0",
    summary: "Proprietary/restrictive. Free for non-commercial use only; commercial use requires a separate license.",
  },
  "BUSL-1.1": {
    name: "Business Source License 1.1",
    summary: "Source-available but not open source. Free for non-production use; production use requires a commercial license until the change date.",
  },
};

const CATEGORY_DESCRIPTIONS: Record<LicenseCategory, { label: string; description: string; defaultAction: PolicyAction }> = {
  [LicenseCategory.Permissive]: {
    label: "Permissive",
    description: "Allow commercial use, modification, and redistribution with minimal obligations (typically just attribution). Safe for most projects.",
    defaultAction: PolicyAction.Allow,
  },
  [LicenseCategory.WeakCopyleft]: {
    label: "Weak Copyleft",
    description: "Allow linking and use in proprietary software, but require changes to the licensed component itself to be shared. Review on a case-by-case basis.",
    defaultAction: PolicyAction.Warn,
  },
  [LicenseCategory.StrongCopyleft]: {
    label: "Strong Copyleft",
    description: "Require derivative works to be distributed under the same license. Can force your entire project to become open source if not carefully isolated.",
    defaultAction: PolicyAction.Block,
  },
  [LicenseCategory.Proprietary]: {
    label: "Proprietary / Restrictive",
    description: "Impose significant restrictions on commercial use, redistribution, or require separate paid licenses. Require legal review before adoption.",
    defaultAction: PolicyAction.Warn,
  },
  [LicenseCategory.Unknown]: {
    label: "Unknown",
    description: "License could not be identified. May indicate a missing license declaration or an unrecognized SPDX identifier. Investigate manually.",
    defaultAction: PolicyAction.Warn,
  },
};

const POLICY_ACTION_LABELS: Record<PolicyAction, string> = {
  [PolicyAction.Allow]: "Allow",
  [PolicyAction.Warn]: "Warn",
  [PolicyAction.Block]: "Block",
};

const ALL_CATEGORIES = [
  LicenseCategory.Permissive,
  LicenseCategory.WeakCopyleft,
  LicenseCategory.StrongCopyleft,
  LicenseCategory.Proprietary,
  LicenseCategory.Unknown,
];

export const LicenseGuide: React.FC = () => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<LicenseCategory | null>(null);

  const licenses = React.useMemo(() => {
    return Object.entries(LICENSE_CATEGORIES).map(([spdx, category]) => ({
      spdx,
      category,
      info: LICENSE_INFO[spdx] || { name: spdx, summary: "No description available." },
    }));
  }, []);

  const filtered = React.useMemo(() => {
    let result = licenses;
    if (selectedCategory !== null) {
      result = result.filter((l) => l.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.spdx.toLowerCase().includes(term) ||
          l.info.name.toLowerCase().includes(term) ||
          l.info.summary.toLowerCase().includes(term)
      );
    }
    return result;
  }, [licenses, searchTerm, selectedCategory]);

  const categoryOrder = [
    LicenseCategory.Permissive,
    LicenseCategory.WeakCopyleft,
    LicenseCategory.StrongCopyleft,
    LicenseCategory.Proprietary,
  ];

  const grouped = React.useMemo(() => {
    const map = new Map<LicenseCategory, typeof filtered>();
    for (const cat of categoryOrder) {
      const items = filtered.filter((l) => l.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>
        License Guide
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
        Reference of all recognized open-source licenses, grouped by category. Use this to understand
        what each license requires and how the default policy treats it.
      </p>

      {/* Category overview cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {ALL_CATEGORIES.map((cat) => {
          const info = CATEGORY_DESCRIPTIONS[cat];
          const color = LICENSE_CATEGORY_COLORS[cat];
          return (
            <div
              key={cat}
              style={{
                flex: "1 1 180px",
                maxWidth: 280,
                padding: "12px 16px",
                borderRadius: 6,
                border: `1px solid ${theme.borderDefault}`,
                background: theme.bgSurface,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>
                  {info.label}
                </span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: theme.textSecondary, lineHeight: 1.5 }}>
                {info.description}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: theme.textMuted }}>Default policy:</span>
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#fff",
                    background: POLICY_ACTION_COLORS[info.defaultAction],
                  }}
                >
                  {POLICY_ACTION_LABELS[info.defaultAction]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search licenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "5px 10px",
            border: `1px solid ${theme.borderInput}`,
            borderRadius: 3,
            fontSize: 12,
            background: theme.bgSurface,
            color: theme.textPrimary,
            width: 220,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 0, borderRadius: 3, overflow: "hidden", border: `1px solid ${theme.borderDefault}` }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "4px 10px",
              border: "none",
              fontSize: 11,
              cursor: "pointer",
              background: selectedCategory === null ? "#0078d4" : theme.btnDefaultBg,
              color: selectedCategory === null ? "#fff" : theme.textPrimary,
              borderRight: `1px solid ${theme.borderDefault}`,
            }}
          >
            All
          </button>
          {categoryOrder.map((cat, i) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              style={{
                padding: "4px 10px",
                border: "none",
                fontSize: 11,
                cursor: "pointer",
                background: selectedCategory === cat ? LICENSE_CATEGORY_COLORS[cat] : theme.btnDefaultBg,
                color: selectedCategory === cat ? "#fff" : theme.textPrimary,
                borderRight: i < categoryOrder.length - 1 ? `1px solid ${theme.borderDefault}` : "none",
              }}
            >
              {CATEGORY_DESCRIPTIONS[cat].label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: 4 }}>
          {filtered.length} license{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* License table grouped by category */}
      {Array.from(grouped.entries()).map(([cat, items]) => {
        const catInfo = CATEGORY_DESCRIPTIONS[cat];
        const color = LICENSE_CATEGORY_COLORS[cat];
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
                {catInfo.label}
              </h3>
              <span style={{ fontSize: 11, color: theme.textMuted }}>({items.length})</span>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: `2px solid ${theme.borderDefault}`,
                  }}
                >
                  <th style={{ padding: "6px 10px", fontWeight: 600, color: theme.textSecondary, width: 180 }}>
                    SPDX ID
                  </th>
                  <th style={{ padding: "6px 10px", fontWeight: 600, color: theme.textSecondary, width: 260 }}>
                    Full Name
                  </th>
                  <th style={{ padding: "6px 10px", fontWeight: 600, color: theme.textSecondary }}>
                    Key Obligations
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr
                    key={l.spdx}
                    style={{
                      borderBottom: `1px solid ${theme.borderRow}`,
                    }}
                  >
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#fff",
                          background: color,
                        }}
                      >
                        {l.spdx}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: theme.textPrimary }}>
                      {l.info.name}
                    </td>
                    <td style={{ padding: "8px 10px", color: theme.textSecondary, lineHeight: 1.4 }}>
                      {l.info.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: theme.textMuted, fontSize: 13 }}>
          No licenses match your search.
        </div>
      )}
    </div>
  );
};
