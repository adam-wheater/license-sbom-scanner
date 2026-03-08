import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PolicySettings } from "@/components/PolicySettings";
import { LicenseCategory, PolicyAction, LicensePolicy } from "@/models/types";
import { DEFAULT_POLICY } from "@/models/LicenseRegistry";

describe("PolicySettings", () => {
  const mockSave = jest.fn().mockResolvedValue(undefined);
  const mockReset = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockSave.mockClear();
    mockReset.mockClear();
  });

  test("renders category defaults", () => {
    render(
      <PolicySettings
        policy={DEFAULT_POLICY}
        onSave={mockSave}
        onReset={mockReset}
        loading={false}
      />
    );

    expect(screen.getByText("Category Defaults")).toBeInTheDocument();
    expect(screen.getByText("License Policy")).toBeInTheDocument();
  });

  test("shows unsaved changes indicator when policy is modified", () => {
    render(
      <PolicySettings
        policy={DEFAULT_POLICY}
        onSave={mockSave}
        onReset={mockReset}
        loading={false}
      />
    );

    // Initially no unsaved changes
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    // Change a category default to trigger dirty state
    const selects = screen.getAllByRole("combobox");
    // The first select corresponds to "permissive" category
    fireEvent.change(selects[0], { target: { value: PolicyAction.Warn } });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  test("calls onSave when Save button clicked", async () => {
    render(
      <PolicySettings
        policy={DEFAULT_POLICY}
        onSave={mockSave}
        onReset={mockReset}
        loading={false}
      />
    );

    fireEvent.click(screen.getByText("Save Policy"));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });

  test("calls onReset when Reset button clicked", () => {
    render(
      <PolicySettings
        policy={DEFAULT_POLICY}
        onSave={mockSave}
        onReset={mockReset}
        loading={false}
      />
    );

    fireEvent.click(screen.getByText("Reset to Defaults"));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  test("can add a specific license override", () => {
    render(
      <PolicySettings
        policy={DEFAULT_POLICY}
        onSave={mockSave}
        onReset={mockReset}
        loading={false}
      />
    );

    // Type a license ID in the override input
    const inputs = screen.getAllByRole("textbox");
    const licenseInput = inputs.find((input: HTMLElement) =>
      (input as HTMLInputElement).placeholder?.includes("SPDX License ID")
    )!;
    fireEvent.change(licenseInput, { target: { value: "GPL-3.0-only" } });

    // Click Add
    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]); // First Add button is for overrides

    // The override should now appear in the list
    expect(screen.getByText("GPL-3.0-only")).toBeInTheDocument();
  });

  test("renders excluded packages with ecosystem scope", () => {
    const policy: LicensePolicy = {
      ...DEFAULT_POLICY,
      excludedPackages: [
        { name: "internal-pkg", ecosystem: undefined },
        { name: "scoped-pkg", ecosystem: "nuget" as any },
      ],
    };

    render(
      <PolicySettings policy={policy} onSave={mockSave} onReset={mockReset} loading={false} />
    );

    expect(screen.getByText("internal-pkg")).toBeInTheDocument();
    expect(screen.getByText("scoped-pkg")).toBeInTheDocument();
    expect(screen.getByText("all ecosystems")).toBeInTheDocument();
    // "nuget" appears both as the ecosystem badge on the excluded package
    // and as an option in the ecosystem select dropdown
    const nugetElements = screen.getAllByText("nuget");
    expect(nugetElements.length).toBeGreaterThanOrEqual(2);
  });

  test("disables buttons when loading", () => {
    render(
      <PolicySettings
        policy={DEFAULT_POLICY}
        onSave={mockSave}
        onReset={mockReset}
        loading={true}
      />
    );

    expect(screen.getByText("Save Policy")).toBeDisabled();
    expect(screen.getByText("Reset to Defaults")).toBeDisabled();
  });
});
