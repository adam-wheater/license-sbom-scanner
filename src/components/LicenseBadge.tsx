import * as React from "react";
import { LicenseCategory } from "@/models/types";
import { LICENSE_CATEGORY_COLORS } from "@/utils/Constants";

interface LicenseBadgeProps {
  license: string;
  category: LicenseCategory;
}

export const LicenseBadge: React.FC<LicenseBadgeProps> = ({ license, category }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 3,
      fontSize: 11,
      fontWeight: 600,
      color: "#fff",
      background: LICENSE_CATEGORY_COLORS[category],
      whiteSpace: "nowrap",
    }}
  >
    {license}
  </span>
);
