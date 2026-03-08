import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SbomExport } from "@/components/SbomExport";
import {
  RepoScanResult,
  Ecosystem,
  DependencyScope,
  LicenseCategory,
  SbomDocument,
  FreshnessStatus,
} from "@/models/types";

function makeMinimalSbom(repoName: string, componentCount: number): SbomDocument {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:test-${repoName}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: "license-sbom-scanner", version: "1.0.0" }],
      component: { type: "application", name: repoName },
    },
    components: Array.from({ length: componentCount }, (_, i) => ({
      type: "library" as const,
      name: `pkg-${i}`,
      version: "1.0.0",
      purl: `pkg:nuget/pkg-${i}@1.0.0`,
      licenses: [{ license: { id: "MIT" } }],
      scope: "required" as const,
    })),
  };
}

function makeRepo(name: string, componentCount: number): RepoScanResult {
  return {
    repoName: name,
    repoId: `id-${name}`,
    dependencies: Array.from({ length: componentCount }, (_, i) => ({
      name: `pkg-${i}`,
      version: "1.0.0",
      ecosystem: Ecosystem.NuGet,
      scope: DependencyScope.Runtime,
      sourceFile: "/test.csproj",
      license: "MIT",
      licenseCategory: LicenseCategory.Permissive,
    })),
    violations: [],
    freshnessResults: [],
    sbom: makeMinimalSbom(name, componentCount),
    scannedAt: new Date(),
    fileCount: 1,
    internalPackages: [],
  };
}

describe("SbomExport", () => {
  test("renders repo list with component counts", () => {
    const repos = [makeRepo("repo-a", 5), makeRepo("repo-b", 3)];

    render(<SbomExport repos={repos} selectedRepo={null} />);

    expect(screen.getByText("repo-a")).toBeInTheDocument();
    expect(screen.getByText("repo-b")).toBeInTheDocument();
    expect(screen.getByText("5 components")).toBeInTheDocument();
    expect(screen.getByText("3 components")).toBeInTheDocument();
  });

  test("shows Download All button when multiple repos and none selected", () => {
    const repos = [makeRepo("repo-a", 5), makeRepo("repo-b", 3)];

    render(<SbomExport repos={repos} selectedRepo={null} />);

    expect(screen.getByText("Download All SBOMs")).toBeInTheDocument();
  });

  test("hides Download All button when a repo is selected", () => {
    const repos = [makeRepo("repo-a", 5), makeRepo("repo-b", 3)];

    render(<SbomExport repos={repos} selectedRepo="repo-a" />);

    expect(screen.queryByText("Download All SBOMs")).not.toBeInTheDocument();
    // Only the selected repo should be visible
    expect(screen.getByText("repo-a")).toBeInTheDocument();
    expect(screen.queryByText("repo-b")).not.toBeInTheDocument();
  });

  test("shows preview when Preview button is clicked", () => {
    const repos = [makeRepo("repo-a", 2)];

    render(<SbomExport repos={repos} selectedRepo={null} />);

    // Click Preview
    fireEvent.click(screen.getByText("Preview"));

    // Should show Hide button instead
    expect(screen.getByText("Hide")).toBeInTheDocument();

    // The JSON preview should contain CycloneDX format info
    expect(screen.getByText(/bomFormat/)).toBeInTheDocument();
  });

  test("Download JSON button is disabled when no components", () => {
    const repos = [makeRepo("empty-repo", 0)];

    render(<SbomExport repos={repos} selectedRepo={null} />);

    const downloadButton = screen.getByText("Download JSON");
    expect(downloadButton).toBeDisabled();
  });

  test("shows empty state when no repos", () => {
    render(<SbomExport repos={[]} selectedRepo={null} />);

    expect(
      screen.getByText("No repositories with dependencies found.")
    ).toBeInTheDocument();
  });

  test("Download All triggers individual file downloads sequentially", async () => {
    const repos = [makeRepo("repo-a", 2), makeRepo("repo-b", 3)];

    // Mock URL and DOM methods
    const createObjectURL = jest.fn().mockReturnValue("blob:test");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(window, "URL", {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
    });

    const clicks: string[] = [];
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") {
        Object.defineProperty(el, "click", {
          value: () => {
            clicks.push((el as HTMLAnchorElement).download);
          },
        });
      }
      return el;
    });

    render(<SbomExport repos={repos} selectedRepo={null} />);

    fireEvent.click(screen.getByText("Download All SBOMs"));

    // Wait for all downloads to complete
    await screen.findByText("Download All SBOMs");

    // Should produce individual downloads, one per repo
    expect(clicks).toContain("repo-a-sbom-cyclonedx.json");
    expect(clicks).toContain("repo-b-sbom-cyclonedx.json");

    jest.restoreAllMocks();
  });
});
