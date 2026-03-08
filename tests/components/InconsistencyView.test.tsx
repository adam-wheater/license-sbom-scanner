import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InconsistencyView } from "@/components/InconsistencyView";
import { VersionInconsistency } from "@/models/types";

describe("InconsistencyView", () => {
  const sampleInconsistencies: VersionInconsistency[] = [
    {
      packageName: "Newtonsoft.Json",
      ecosystem: "nuget",
      entries: [
        { repoName: "repo-a", version: "13.0.1" },
        { repoName: "repo-b", version: "12.0.3" },
      ],
      hasMajorDifference: true,
    },
    {
      packageName: "Serilog",
      ecosystem: "nuget",
      entries: [
        { repoName: "repo-a", version: "3.0.0" },
        { repoName: "repo-c", version: "3.1.0" },
      ],
      hasMajorDifference: false,
    },
  ];

  test("renders inconsistency list", () => {
    render(<InconsistencyView inconsistencies={sampleInconsistencies} />);

    expect(screen.getByText("Newtonsoft.Json")).toBeInTheDocument();
    expect(screen.getByText("Serilog")).toBeInTheDocument();
  });

  test("shows major diff badge for major version differences", () => {
    render(<InconsistencyView inconsistencies={sampleInconsistencies} />);

    expect(screen.getByText("Major diff")).toBeInTheDocument();
    expect(screen.getByText("Minor diff")).toBeInTheDocument();
  });

  test("sorts versions using semver comparison, not lexicographic", () => {
    const inconsistencies: VersionInconsistency[] = [
      {
        packageName: "test-pkg",
        ecosystem: "npm",
        entries: [
          { repoName: "repo-a", version: "2.0.0" },
          { repoName: "repo-b", version: "10.0.0" },
          { repoName: "repo-c", version: "1.0.0" },
        ],
        hasMajorDifference: true,
      },
    ];

    const { container } = render(<InconsistencyView inconsistencies={inconsistencies} />);

    // Get version elements in the rendered order
    const versionElements = container.querySelectorAll(
      '[style*="font-family: monospace"][style*="min-width"]'
    );
    const renderedVersions = Array.from(versionElements).map((el: Element) =>
      el.textContent?.trim()
    );

    // Should be sorted by semver: 1.0.0, 2.0.0, 10.0.0 (not 1.0.0, 10.0.0, 2.0.0)
    expect(renderedVersions).toEqual(["1.0.0", "2.0.0", "10.0.0"]);
  });

  test("shows empty state when no inconsistencies", () => {
    render(<InconsistencyView inconsistencies={[]} />);

    expect(
      screen.getByText("No version inconsistencies detected across repositories.")
    ).toBeInTheDocument();
  });

  test("filters by search term", () => {
    render(<InconsistencyView inconsistencies={sampleInconsistencies} />);

    const input = screen.getByPlaceholderText("Filter by package, ecosystem, or repo...");
    fireEvent.change(input, { target: { value: "Newtonsoft" } });

    expect(screen.getByText("Newtonsoft.Json")).toBeInTheDocument();
    expect(screen.queryByText("Serilog")).not.toBeInTheDocument();
  });

  test("shows repo names for each version", () => {
    render(<InconsistencyView inconsistencies={sampleInconsistencies} />);

    // "repo-a" appears in both inconsistency entries
    const repoAElements = screen.getAllByText("repo-a");
    expect(repoAElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("repo-b")).toBeInTheDocument();
  });

  test("displays count of filtered items", () => {
    render(<InconsistencyView inconsistencies={sampleInconsistencies} />);

    expect(screen.getByText("2 of 2 packages")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("Filter by package, ecosystem, or repo...");
    fireEvent.change(input, { target: { value: "Serilog" } });

    expect(screen.getByText("1 of 2 packages")).toBeInTheDocument();
  });
});
