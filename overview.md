# License & SBOM Scanner

Scan all repositories in your Azure DevOps project for dependency license compliance, policy violations, and generate CycloneDX Software Bill of Materials (SBOM) documents.

## Features

- **Multi-ecosystem scanning**: Automatically detects and parses NuGet (.csproj, packages.config, Directory.Packages.props), npm (package.json, package-lock.json), Go (go.mod), Python (requirements.txt, pyproject.toml, Pipfile), and Maven (pom.xml)
- **License detection**: Resolves licenses from file metadata and a built-in registry of 800+ common packages
- **Policy engine**: Configurable license policy that categorizes licenses as Permissive, Weak Copyleft, Strong Copyleft, or Unknown — with Allow, Warn, or Block actions per category
- **CycloneDX SBOM generation**: Export industry-standard CycloneDX 1.5 JSON documents per repository, including Package URLs (purl) for every component
- **Cross-repo analysis**: Detect version inconsistencies (same package at different versions across repos) and view aggregate compliance across all repositories
- **Dark mode support**: Full light/dark theme matching your Azure DevOps settings

## How It Works

1. Click **Scan All Repos** to scan every Git repository in the current project
2. The scanner discovers dependency files, parses them with ecosystem-specific parsers, and resolves licenses
3. Dependencies are evaluated against your license policy — violations are flagged as **Blocked** or **Warnings**
4. Browse results by repository, view dependency tables, download SBOM documents, and configure policy

## License Categories

| Category | Default Action | Examples |
|----------|---------------|----------|
| Permissive | Allow | MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC |
| Weak Copyleft | Warn | LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-1.0, EPL-2.0 |
| Strong Copyleft | Block | GPL-2.0, GPL-3.0, AGPL-3.0, SSPL-1.0 |
| Unknown | Warn | Packages not found in the built-in registry |

## Policy Configuration

Customize your license policy from the **Settings** tab:

- **Category defaults**: Change the action (Allow/Warn/Block) for each license category
- **Specific overrides**: Override the action for individual SPDX license IDs
- **Excluded packages**: Skip specific packages during evaluation

Policy settings are persisted per organization using the Azure DevOps Extension Data Service.

## Privacy

This extension runs **entirely in the browser**. No source code, dependency data, or license information is sent to external services. All scanning and analysis happens within the Azure DevOps iframe using the Git REST API.

## Permissions

This extension requires the `vso.code` scope (read-only access to Git repositories) to discover and read dependency files.
