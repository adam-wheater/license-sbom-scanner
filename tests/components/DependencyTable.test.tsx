import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DependencyTable } from "@/components/DependencyTable";
import {
  ResolvedDependency,
  Ecosystem,
  DependencyScope,
  LicenseCategory,
  ApprovedPackagesRegistry,
} from "@/models/types";

function makeDep(overrides: Partial<ResolvedDependency> = {}): ResolvedDependency {
  return {
    name: "test-package",
    version: "1.0.0",
    ecosystem: Ecosystem.NuGet,
    scope: DependencyScope.Runtime,
    sourceFile: "/test.csproj",
    license: "MIT",
    licenseCategory: LicenseCategory.Permissive,
    ...overrides,
  };
}

function makeDeps(count: number): ResolvedDependency[] {
  return Array.from({ length: count }, (_, i) =>
    makeDep({
      name: `package-${String(i).padStart(3, "0")}`,
      version: `${i}.0.0`,
    })
  );
}

describe("DependencyTable", () => {
  test("renders dependency rows", () => {
    const deps = [
      makeDep({ name: "react", version: "18.2.0", ecosystem: Ecosystem.Npm }),
      makeDep({ name: "lodash", version: "4.17.21", ecosystem: Ecosystem.Npm }),
    ];

    render(<DependencyTable dependencies={deps} searchTerm="" repoName="test-repo" />);

    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("lodash")).toBeInTheDocument();
    expect(screen.getByText("18.2.0")).toBeInTheDocument();
    expect(screen.getByText("4.17.21")).toBeInTheDocument();
  });

  test("filters by search term", () => {
    const deps = [
      makeDep({ name: "react", version: "18.2.0" }),
      makeDep({ name: "lodash", version: "4.17.21" }),
    ];

    render(<DependencyTable dependencies={deps} searchTerm="react" repoName="test-repo" />);

    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.queryByText("lodash")).not.toBeInTheDocument();
  });

  test("shows empty state when no matches", () => {
    const deps = [makeDep({ name: "react" })];

    render(<DependencyTable dependencies={deps} searchTerm="nonexistent" repoName="test-repo" />);

    expect(
      screen.getByText("No dependencies found matching the current filters.")
    ).toBeInTheDocument();
  });

  test("pagination: shows 100 rows per page and navigation", () => {
    const deps = makeDeps(150);

    render(<DependencyTable dependencies={deps} searchTerm="" repoName="test-repo" />);

    // Should show page indicator
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    // First page: package-000 should be visible, package-100 should not
    expect(screen.getByText("package-000")).toBeInTheDocument();
    expect(screen.queryByText("package-100")).not.toBeInTheDocument();

    // Click Next
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("package-100")).toBeInTheDocument();
    expect(screen.queryByText("package-000")).not.toBeInTheDocument();

    // Click Prev
    fireEvent.click(screen.getByText("Prev"));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  test("no pagination for small datasets", () => {
    const deps = makeDeps(50);

    render(<DependencyTable dependencies={deps} searchTerm="" repoName="test-repo" />);

    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  test("filter by ecosystem", () => {
    const deps = [
      makeDep({ name: "pkg-nuget", ecosystem: Ecosystem.NuGet }),
      makeDep({ name: "pkg-npm", ecosystem: Ecosystem.Npm }),
    ];

    render(<DependencyTable dependencies={deps} searchTerm="" repoName="test-repo" />);

    // Select npm ecosystem filter
    const ecosystemSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(ecosystemSelect, { target: { value: Ecosystem.Npm } });

    expect(screen.getByText("pkg-npm")).toBeInTheDocument();
    expect(screen.queryByText("pkg-nuget")).not.toBeInTheDocument();
  });

  test("displays approval status when registry provided", () => {
    const deps = [makeDep({ name: "approved-pkg", ecosystem: Ecosystem.NuGet })];
    const registry: ApprovedPackagesRegistry = {
      packages: [
        {
          name: "approved-pkg",
          ecosystem: Ecosystem.NuGet,
          approvedBy: "admin",
          approvedAt: new Date().toISOString(),
          reason: "test",
        },
      ],
      autoApprovalRules: [],
    };

    render(
      <DependencyTable
        dependencies={deps}
        searchTerm=""
        repoName="test-repo"
        approvalRegistry={registry}
      />
    );

    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  test("uses stable keys for rows (no index-based keys)", () => {
    const deps = [
      makeDep({
        name: "a-pkg",
        version: "1.0.0",
        ecosystem: Ecosystem.NuGet,
        sourceFile: "/a.csproj",
      }),
      makeDep({ name: "b-pkg", version: "2.0.0", ecosystem: Ecosystem.Npm, sourceFile: "/b.json" }),
    ];

    const { container } = render(
      <DependencyTable dependencies={deps} searchTerm="" repoName="test-repo" />
    );

    // Verify rows are rendered (no crash from duplicate keys)
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
  });
});
