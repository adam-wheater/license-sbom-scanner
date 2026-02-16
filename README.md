# License & SBOM Compliance Scanner

An Azure DevOps extension that scans every repository in your project for dependency license compliance, evaluates configurable policies, and generates industry-standard CycloneDX 1.5 SBOM documents — all running entirely in the browser with zero external API calls.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Azure DevOps  ▸  Repos  ▸  Compliance                                     │
├──────────┬──────────────────────────────────────────────────────────────────┤
│          │  ┌──────────────────────────────────────────────────────────┐    │
│  REPOS   │  │  Overview │ Dependencies │ Violations │ SBOM │ Settings │    │
│          │  ├──────────────────────────────────────────────────────────┤    │
│ ● api    │  │                                                         │    │
│   web    │  │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │    │
│   lib    │  │   │  12  │ │ 347  │ │   3  │ │  18  │ │ 2.1s │        │    │
│   tools  │  │   │Repos │ │ Deps │ │Block │ │Warns │ │ Time │        │    │
│          │  │   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │    │
│          │  │                                                         │    │
│          │  │   Dependencies by Ecosystem                             │    │
│          │  │   ■ nuget 187  ■ npm 94  ■ python 38  ■ go 28         │    │
│          │  │                                                         │    │
│          │  │   Dependencies by License Category                      │    │
│          │  │   ■ permissive 298  ■ weak-copyleft 31  ■ unknown 18  │    │
│          │  │                                                         │    │
│          │  └──────────────────────────────────────────────────────────┘    │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Supported Ecosystems](#supported-ecosystems)
- [Architecture](#architecture)
- [Scanning Pipeline](#scanning-pipeline)
- [License Resolution](#license-resolution)
- [Policy Engine](#policy-engine)
- [SBOM Generation](#sbom-generation)
- [UI Views](#ui-views)
- [Privacy & Security](#privacy--security)
- [Development](#development)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Publishing](#publishing)

---

## Features

- **Multi-Ecosystem Scanning** — NuGet, npm, Go, Python, and Maven
- **800+ Built-in License Mappings** — Static registry for instant offline resolution
- **3-Tier License Resolution** — File metadata → built-in registry → unknown fallback
- **Configurable Policy Engine** — Category defaults, per-license overrides, package exclusions
- **CycloneDX 1.5 SBOM** — Industry-standard JSON with proper Package URLs
- **Cross-Repo Analysis** — Scan all repositories in a project in one click
- **Dark/Light Theme** — Automatic detection of Azure DevOps theme preferences
- **Zero External Calls** — All processing runs in the browser; your code never leaves your network

---

## How It Works

```
  ┌──────────────┐         ┌─────────────────┐         ┌──────────────────┐
  │  User clicks  │         │   Azure DevOps   │         │   Extension UI    │
  │  "Scan All   │────────▶│   Git REST API   │────────▶│   renders results │
  │   Repos"     │         │   (read-only)    │         │   in browser      │
  └──────────────┘         └─────────────────┘         └──────────────────┘

  The extension:
  1. Lists all Git repositories in the current Azure DevOps project
  2. Discovers dependency files (package.json, .csproj, go.mod, etc.)
  3. Fetches file contents via the Git API
  4. Parses dependencies with ecosystem-specific parsers
  5. Resolves licenses using a 3-tier strategy
  6. Evaluates violations against your configured policy
  7. Generates CycloneDX 1.5 SBOM documents per repository
```

---

## Supported Ecosystems

```
┌────────────┬─────────────────────────────────────────────────────────────┐
│ Ecosystem  │ Files Scanned                                              │
├────────────┼─────────────────────────────────────────────────────────────┤
│ NuGet      │ .csproj, packages.config, Directory.Packages.props, .nuspec│
│ npm        │ package.json, package-lock.json                            │
│ Go         │ go.mod                                                     │
│ Python     │ requirements*.txt, pyproject.toml, setup.py, setup.cfg,    │
│            │ Pipfile                                                    │
│ Maven      │ pom.xml                                                    │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### Parser Details

**NuGet** — Extracts `<PackageReference>` elements (with inline and child `Version` attributes), `<package>` elements from `packages.config`, centralized versions from `Directory.Packages.props`, and metadata from `.nuspec`. Detects test dependencies by package name patterns (xunit, nunit, moq, etc.).

**npm** — Parses all dependency sections (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`). Handles `package-lock.json` v1 (dependencies tree), v2/v3 (packages map). Extracts declared license from the `license` field.

**Go** — Parses `require` blocks (single-line and multi-line). Marks `// indirect` dependencies as optional scope.

**Python** — Handles `requirements.txt` (with version specifiers and `-r` includes), `pyproject.toml` (project.dependencies and optional-dependencies), `setup.py`/`setup.cfg` (install_requires), and `Pipfile` (packages and dev-packages). Normalizes package names per PEP 503.

**Maven** — Extracts `<dependency>` blocks from `pom.xml`, maps `<scope>test</scope>` to test scope, and reads project-level `<licenses>` for declared license metadata. Skips `<dependencyManagement>` sections.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Azure DevOps Browser                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    ComplianceHub (Entry)                       │  │
│  │         SDK.init() → SDK.ready() → React.createRoot()         │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                             │                                       │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                    ThemeProvider + App                          │  │
│  │  ┌─────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐  │  │
│  │  │ Control │ │ RepoList     │ │ RepoDetail │ │ Overview   │  │  │
│  │  │ Bar     │ │  (sidebar)   │ │  (panel)   │ │ Panel      │  │  │
│  │  └─────────┘ └──────────────┘ └────────────┘ └────────────┘  │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐    │  │
│  │  │ Dependency   │ │ Policy       │ │ SBOM Export        │    │  │
│  │  │ Table        │ │ Violations   │ │ (download/preview) │    │  │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘    │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │            Policy Settings (CRUD)                     │    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Scanning Layer                            │  │
│  │                                                                │  │
│  │  ScanOrchestrator                                              │  │
│  │   ├── FileDiscovery ──────── Git API (getItems, recursive)     │  │
│  │   ├── FileContentFetcher ─── Git API (getItemText)             │  │
│  │   ├── Parsers ────────────── NuGet│npm│Go│Python│Maven         │  │
│  │   ├── LicenseResolver ────── 3-tier (declared→registry→unknown)│  │
│  │   ├── PolicyEngine ──────── Evaluate against LicensePolicy     │  │
│  │   ├── FreshnessAnalyzer ──── Cross-repo version tracking       │  │
│  │   └── SbomGenerator ─────── CycloneDX 1.5 JSON + purls        │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Data / Services                           │  │
│  │                                                                │  │
│  │  LicenseRegistry ──── 800+ package→SPDX mappings               │  │
│  │  PolicySettingsService ── Extension Data Service persistence    │  │
│  │  ApiClient ──────────── Azure DevOps GitRestClient wrapper     │  │
│  │  ConcurrencyLimiter ──── Semaphore-style promise queue         │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.4 (strict mode, ES2020) |
| UI | React 18 (functional components, hooks, createRoot) |
| Styling | All inline styles (no CSS files) |
| Bundler | Webpack 5 with ts-loader |
| Testing | Jest 29 + ts-jest |
| Extension SDK | azure-devops-extension-sdk 4.x |
| API | azure-devops-extension-api 4.x (GitRestClient) |
| Linting | ESLint + Prettier |
| CI | GitHub Actions |

---

## Scanning Pipeline

The `ScanOrchestrator` coordinates the entire scan across all repositories:

```
┌────────────────────────────────────────────────────────────────┐
│                      SCAN PIPELINE                              │
│                                                                  │
│  Phase 1: DISCOVERY                                              │
│  ┌──────────────────────────────────────────────────┐           │
│  │  SDK.getProject() → ApiClient.getRepositories()   │           │
│  │  For each repo:                                    │           │
│  │    FileDiscovery.discoverFiles()                   │           │
│  │    └─ Git API: list all files recursively          │           │
│  │    └─ Filter by DEPENDENCY_FILE_PATTERNS           │           │
│  │    └─ Exclude SKIP_PATTERNS (node_modules, etc.)   │           │
│  └──────────────────────────────────────────────────┘           │
│                          │                                       │
│                          ▼                                       │
│  Phase 2: FETCH                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  FileContentFetcher.fetchFileContents()            │           │
│  │  └─ Concurrent file downloads (max 10 parallel)    │           │
│  │  └─ Skip files > 1 MB                              │           │
│  └──────────────────────────────────────────────────┘           │
│                          │                                       │
│                          ▼                                       │
│  Phase 3: PARSE                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Match file → parser by filePatterns regex          │           │
│  │  Parser.parse() → ParsedDependency[]               │           │
│  │  Deduplicate by ecosystem:name (keep first)        │           │
│  └──────────────────────────────────────────────────┘           │
│                          │                                       │
│                          ▼                                       │
│  Phase 4: RESOLVE                                                │
│  ┌──────────────────────────────────────────────────┐           │
│  │  LicenseResolver.resolve()                         │           │
│  │  └─ Tier 1: Declared license from file metadata    │           │
│  │  └─ Tier 2: KNOWN_LICENSES registry (800+ pkgs)   │           │
│  │  └─ Tier 3: "Unknown" fallback                     │           │
│  └──────────────────────────────────────────────────┘           │
│                          │                                       │
│                          ▼                                       │
│  Phase 5: EVALUATE                                               │
│  ┌──────────────────────────────────────────────────┐           │
│  │  PolicyEngine.evaluate()                           │           │
│  │  └─ Check excluded packages                        │           │
│  │  └─ Check specific license overrides               │           │
│  │  └─ Apply category defaults                        │           │
│  │  └─ Emit PolicyViolation[] (warn or block)         │           │
│  └──────────────────────────────────────────────────┘           │
│                          │                                       │
│                          ▼                                       │
│  Phase 6: GENERATE                                               │
│  ┌──────────────────────────────────────────────────┐           │
│  │  SbomGenerator.generate()                          │           │
│  │  └─ CycloneDX 1.5 JSON per repo                   │           │
│  │  └─ Package URLs (purl) per component              │           │
│  │  └─ Scope mapping: dev/test → optional             │           │
│  └──────────────────────────────────────────────────┘           │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Sort repos: most violations first                 │           │
│  │  Return FullScanResult → UI renders                │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────┘

  Concurrency:  5 repos in parallel  ×  10 files per repo
  File limit:   1 MB max per file
  Skip paths:   node_modules, vendor, .git, dist, bin, obj, packages
```

---

## License Resolution

The resolver uses a 3-tier fallback strategy to determine each dependency's license:

```
                    ┌───────────────────┐
                    │ ParsedDependency  │
                    │   (from parser)   │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
              ┌─yes─┤ Has declared      │
              │     │ license in file?  │
              │     └────────┬──────────┘
              │              │ no
              │     ┌────────▼──────────┐
              │┌─yes┤ Found in built-in │
              ││    │ registry (800+)?  │
              ││    └────────┬──────────┘
              ││             │ no
              ││    ┌────────▼──────────┐
              ││    │ Mark as "Unknown" │
              ││    └────────┬──────────┘
              ││             │
              ▼▼             ▼
         ┌──────────────────────┐       ┌───────────────────────┐
         │  Normalize to SPDX   │       │  Categorize license   │
         │  (MIT, Apache-2.0…)  │──────▶│  into category        │
         └──────────────────────┘       └───────────┬───────────┘
                                                    │
                               ┌────────────────────▼─────────────────────┐
                               │          License Categories               │
                               ├───────────────┬───────────────────────────┤
                               │ Permissive    │ MIT, Apache-2.0, BSD-*,  │
                               │               │ ISC, Unlicense, CC0, … │
                               ├───────────────┼───────────────────────────┤
                               │ Weak Copyleft │ LGPL-*, MPL-2.0, EPL-*, │
                               │               │ CDDL-*, MS-RL           │
                               ├───────────────┼───────────────────────────┤
                               │ Strong        │ GPL-*, AGPL-*, SSPL-1.0,│
                               │ Copyleft      │ OSL-3.0, EUPL-1.2       │
                               ├───────────────┼───────────────────────────┤
                               │ Proprietary   │ RPL-1.5, Polyform, BUSL │
                               ├───────────────┼───────────────────────────┤
                               │ Unknown       │ (fallback)               │
                               └───────────────┴───────────────────────────┘
```

### SPDX Normalization

Common license string variations are normalized to standard SPDX identifiers:

| Input Variations | Normalized SPDX ID |
|-----------------|-------------------|
| `mit`, `MIT License` | `MIT` |
| `apache 2.0`, `Apache License 2.0` | `Apache-2.0` |
| `bsd 3-clause`, `New BSD` | `BSD-3-Clause` |
| `gpl-3`, `GNU GPL v3` | `GPL-3.0-only` |
| `mpl-2`, `Mozilla Public License` | `MPL-2.0` |

### Built-in Registry Coverage

| Ecosystem | Packages Mapped | Notable Packages |
|-----------|----------------|-----------------|
| NuGet | 210+ | Newtonsoft.Json, Serilog, EF Core, Dapper, xUnit, MediatR |
| npm | 87 | react, express, typescript, webpack, jest, prisma |
| Go | 25 | gin, gorilla/mux, testify, zap, cobra, gorm |
| Python | 44 | django, flask, fastapi, numpy, pandas, pytest |
| Maven | 43 | guava, spring-boot, jackson, hibernate, junit |

---

## Policy Engine

The policy engine evaluates every resolved dependency against a configurable `LicensePolicy`:

```
┌──────────────────────────────────────────────────────────────────┐
│                       POLICY EVALUATION                           │
│                                                                    │
│  For each ResolvedDependency:                                      │
│                                                                    │
│  ┌─────────────────────────────────┐                              │
│  │ Is package in excludedPackages? │──── yes ──▶ SKIP (no check)  │
│  └──────────────┬──────────────────┘                              │
│                 no                                                  │
│  ┌──────────────▼──────────────────┐                              │
│  │ Has specific license override?  │──── yes ──▶ Use override     │
│  │ (e.g., GPL-3.0-only → Allow)   │            action             │
│  └──────────────┬──────────────────┘                              │
│                 no                                                  │
│  ┌──────────────▼──────────────────┐                              │
│  │ Use category default action     │                              │
│  │ (permissive→Allow, etc.)        │                              │
│  └──────────────┬──────────────────┘                              │
│                 │                                                   │
│  ┌──────────────▼──────────────────┐                              │
│  │ Action = Warn or Block?         │──── no ──▶ PASS              │
│  └──────────────┬──────────────────┘                              │
│                yes                                                  │
│  ┌──────────────▼──────────────────┐                              │
│  │ Create PolicyViolation          │                              │
│  │  { dependency, action, reason } │                              │
│  └─────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

### Default Policy

| License Category | Default Action | Color |
|-----------------|---------------|-------|
| Permissive | Allow | Green |
| Weak Copyleft | Warn | Orange |
| Strong Copyleft | Block | Red |
| Proprietary | Warn | Purple |
| Unknown | Warn | Grey |

### Policy Configuration

Policy settings are persisted via the Azure DevOps Extension Data Service and can be customized through the Settings tab:

**Category Defaults** — Change the default action for each license category. For example, change Weak Copyleft from `Warn` to `Allow` if your organization permits LGPL.

**Specific Overrides** — Override the action for a specific SPDX license ID. For example, allow `GPL-3.0-only` even though strong copyleft is blocked by default.

**Excluded Packages** — Specify packages to skip entirely during policy evaluation. Useful for internal packages or known exceptions.

---

## SBOM Generation

Each scanned repository gets a CycloneDX 1.5 JSON document:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:550e8400-e29b-41d4-a716-446655440000",
  "version": 1,
  "metadata": {
    "timestamp": "2026-02-16T12:00:00.000Z",
    "tools": [{ "name": "license-sbom-scanner", "version": "1.0.0" }],
    "component": { "type": "application", "name": "my-api-service" }
  },
  "components": [
    {
      "type": "library",
      "name": "Newtonsoft.Json",
      "version": "13.0.3",
      "purl": "pkg:nuget/Newtonsoft.Json@13.0.3",
      "licenses": [{ "license": { "id": "MIT" } }],
      "scope": "required"
    }
  ]
}
```

### Package URL (purl) Formats

```
NuGet:   pkg:nuget/Newtonsoft.Json@13.0.3
npm:     pkg:npm/react@18.2.0
npm:     pkg:npm/%40scope%2Fpackage@1.0.0     (scoped)
Go:      pkg:golang/github.com/gin-gonic/gin@v1.9.0
Python:  pkg:pypi/django@4.2.0
Maven:   pkg:maven/org.springframework/spring-core@6.0.0
```

### Scope Mapping

| Dependency Scope | CycloneDX Scope |
|-----------------|----------------|
| runtime, peer, optional | `required` |
| dev, test | `optional` |

---

## UI Views

The extension contributes a **Compliance** hub under the Repos menu in Azure DevOps.

### Overview Tab

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │   12   │  │  347   │  │    3   │  │   18   │  │  2.1s  │   │
│  │ Repos  │  │  Deps  │  │ Blocked│  │ Warns  │  │  Time  │   │
│  │Scanned │  │ Total  │  │        │  │        │  │        │   │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘   │
│                                                                  │
│  Dependencies by Ecosystem                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │■ nuget   │ │■ npm     │ │■ python  │ │■ go      │           │
│  │  187     │ │  94      │ │  38      │ │  28      │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  Dependencies by License Category                                │
│  ┌────────────┐ ┌──────────────┐ ┌─────────┐ ┌─────────┐       │
│  │■ permissive│ │■ weak-copyleft│ │■ unknown│ │■ strong │       │
│  │  298       │ │  31           │ │  18     │ │  3      │       │
│  └────────────┘ └──────────────┘ └─────────┘ └─────────┘       │
│                                                                  │
│  Repos with Most Violations                                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  payment-service      [3 blocked] [5 warnings] 42 deps│      │
│  │  legacy-api           [2 warnings]              18 deps│      │
│  │  data-pipeline        [1 warning]               31 deps│      │
│  └──────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### Dependencies Tab

```
┌──────────┬───────────────────────────────────────────────────────┐
│          │  ┌─Ecosystem──┐  ┌─Category────┐  ┌─Search────────┐  │
│  REPOS   │  │ All      ▼ │  │ All       ▼ │  │              │  │
│          │  └────────────┘  └─────────────┘  └──────────────┘  │
│ ● All    │                                                      │
│   api    │  Showing 347 of 347 dependencies                     │
│   web    │  ┌──────────────┬────────┬──────┬─────────┬───────┐  │
│   lib    │  │ Package    ▲ │Version │ Eco  │ License │ Scope │  │
│          │  ├──────────────┼────────┼──────┼─────────┼───────┤  │
│          │  │ AutoMapper   │ 12.0.1 │nuget │ MIT     │runtime│  │
│          │  │ Dapper       │ 2.1.35 │nuget │Apache2.0│runtime│  │
│          │  │ express      │ 4.18.2 │ npm  │ MIT     │runtime│  │
│          │  │ flask        │ 3.0.0  │python│BSD-3-Cl │runtime│  │
│          │  │ gin          │ v1.9.1 │ go   │ MIT     │runtime│  │
│          │  │ Hangfire     │ 1.8.6  │nuget │LGPL-3.0 │runtime│  │
│          │  └──────────────┴────────┴──────┴─────────┴───────┘  │
└──────────┴──────────────────────────────────────────────────────┘
```

### Violations Tab

```
┌──────────┬───────────────────────────────────────────────────────┐
│          │                                                       │
│  REPOS   │  BLOCKED                                              │
│          │  ┌────────────────────────────────────────────────┐   │
│ ● All    │  │ ■ BLOCK  hibernate-core@5.6.15                │   │
│   api    │  │   Strong copyleft license LGPL-2.1-only on     │   │
│   web    │  │   hibernate-core@5.6.15 — blocked by policy    │   │
│          │  │   repo: java-service                            │   │
│          │  ├────────────────────────────────────────────────┤   │
│          │  │ ■ BLOCK  mysql-connector-java@8.0.33           │   │
│          │  │   Strong copyleft license GPL-2.0-only on      │   │
│          │  │   mysql-connector-java@8.0.33 — blocked        │   │
│          │  │   repo: data-service                            │   │
│          │  └────────────────────────────────────────────────┘   │
│          │                                                       │
│          │  WARNINGS                                             │
│          │  ┌────────────────────────────────────────────────┐   │
│          │  │ ■ WARN   Hangfire@1.8.6                        │   │
│          │  │   Weak copyleft license LGPL-3.0-only on       │   │
│          │  │   Hangfire@1.8.6 — flagged by policy            │   │
│          │  │   repo: api-service                              │   │
│          │  └────────────────────────────────────────────────┘   │
└──────────┴───────────────────────────────────────────────────────┘
```

### SBOM Tab

```
┌──────────┬───────────────────────────────────────────────────────┐
│          │                                                       │
│  REPOS   │  ┌─ api-service ─────────────────────────────────┐   │
│          │  │  ■ permissive 38  ■ weak-copyleft 2           │   │
│ ● All    │  │  42 components                                 │   │
│   api    │  │  [Preview]  [Download]                          │   │
│   web    │  └────────────────────────────────────────────────┘   │
│          │                                                       │
│          │  ┌─ web-app ──────────────────────────────────────┐   │
│          │  │  ■ permissive 89  ■ unknown 3                  │   │
│          │  │  92 components                                  │   │
│          │  │  [Preview]  [Download]                           │   │
│          │  └────────────────────────────────────────────────┘   │
│          │                                                       │
│          │  [Download All SBOMs]                                 │
│          │                                                       │
└──────────┴───────────────────────────────────────────────────────┘

  Download format:  {repoName}-sbom-cyclonedx.json
```

### Settings Tab

```
┌──────────────────────────────────────────────────────────────────┐
│  Policy Settings                                                  │
│                                                                    │
│  Category Defaults                                                 │
│  ┌──────────────────┬──────────────────────┐                      │
│  │ Permissive       │ [Allow ▼]            │                      │
│  │ Weak Copyleft    │ [Warn  ▼]            │                      │
│  │ Strong Copyleft  │ [Block ▼]            │                      │
│  │ Proprietary      │ [Warn  ▼]            │                      │
│  │ Unknown          │ [Warn  ▼]            │                      │
│  └──────────────────┴──────────────────────┘                      │
│                                                                    │
│  Specific License Overrides                                        │
│  ┌──────────────────┬──────────┬──────────┐                       │
│  │ License ID       │ Action   │          │                       │
│  │ GPL-3.0-only     │ [Allow ▼]│ [Remove] │                       │
│  └──────────────────┴──────────┴──────────┘                       │
│  [+ Add Override]                                                  │
│                                                                    │
│  Excluded Packages                                                 │
│  ┌─────────────────────────────────────────┐                      │
│  │  my-internal-package  [x]                │                      │
│  │  legacy-tool          [x]                │                      │
│  └─────────────────────────────────────────┘                      │
│  [+ Add Exclusion]                                                 │
│                                                                    │
│  [Save]  [Reset to Defaults]                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Privacy & Security

- **Runs entirely in the browser** — No backend server, no external API calls
- **Read-only Git access** — Uses the `vso.code` scope (read-only to Git repositories)
- **No code leaves your network** — Dependency files are fetched via the Azure DevOps internal API
- **Settings stored in Azure DevOps** — Policy persisted via Extension Data Service, scoped to your organization
- **No telemetry or analytics** — Zero tracking or data collection

---

## Development

### Prerequisites

- Node.js >= 20
- npm

### Setup

```bash
git clone https://github.com/adam-wheater/license-sbom-scanner.git
cd license-sbom-scanner
npm install --legacy-peer-deps
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production webpack build |
| `npm run build:dev` | Development build with source maps |
| `npm test` | Run Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint on all source files |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting without modifying |
| `npm run package` | Create `.vsix` extension package |

### Project Structure

```
src/
├── ComplianceHub/              # Entry point (SDK init + React mount)
│   ├── ComplianceHub.html      # HTML shell with <div id="root">
│   └── ComplianceHub.tsx       # SDK initialization, React.createRoot
│
├── components/                 # React UI (all functional, all inline styles)
│   ├── App.tsx                 # Main app, ErrorBoundary, tab routing
│   ├── ControlBar.tsx          # Top bar: tabs, scan button, search
│   ├── RepoList.tsx            # Left sidebar: repo list with badges
│   ├── RepoDetail.tsx          # Right panel: per-repo stats
│   ├── DependencyTable.tsx     # Sortable/filterable dependency table
│   ├── PolicyViolations.tsx    # Blocked + warning violation lists
│   ├── SbomExport.tsx          # SBOM preview + download
│   ├── PolicySettings.tsx      # Settings UI (categories, overrides)
│   ├── LicenseBadge.tsx        # Color-coded license badge
│   └── ScanProgress.tsx        # Progress bar during scan
│
├── scanning/                   # Core scanning engine
│   ├── ScanOrchestrator.ts     # Main coordinator (7-phase pipeline)
│   ├── FileDiscovery.ts        # Git API file tree → dependency files
│   ├── FileContentFetcher.ts   # Concurrent file content downloads
│   ├── LicenseResolver.ts      # 3-tier resolution + SPDX normalization
│   └── parsers/
│       ├── IParser.ts          # Parser interface (ecosystem, patterns, parse)
│       ├── NuGetParser.ts      # .csproj, packages.config, .nuspec, ...
│       ├── NpmParser.ts        # package.json, package-lock.json (v1/v2/v3)
│       ├── GoParser.ts         # go.mod (require blocks, indirect deps)
│       ├── PythonParser.ts     # requirements.txt, pyproject.toml, Pipfile, ...
│       └── MavenParser.ts      # pom.xml (dependencies + project license)
│
├── analysis/
│   ├── PolicyEngine.ts         # Evaluate deps against LicensePolicy
│   ├── FreshnessAnalyzer.ts    # Cross-repo version inconsistency tracking
│   └── SbomGenerator.ts        # CycloneDX 1.5 JSON + purl generation
│
├── models/
│   ├── types.ts                # All TypeScript interfaces and enums
│   └── LicenseRegistry.ts     # 800+ package→license + SPDX→category maps
│
├── services/
│   └── PolicySettingsService.ts # Read/write policy via Extension Data Service
│
├── hooks/
│   └── usePolicySettings.ts    # React hook for policy CRUD operations
│
└── utils/
    ├── ApiClient.ts            # Azure DevOps GitRestClient wrapper
    ├── ConcurrencyLimiter.ts   # Promise-based semaphore queue
    ├── Constants.ts            # File patterns, limits, colors
    └── theme.ts                # Dark/light theme detection (MutationObserver)

tests/
├── __mocks__/                  # Azure DevOps SDK mocks
├── parsers/                    # NuGet, npm, Go, Python, Maven parser tests
├── analysis/                   # PolicyEngine, SbomGenerator, Freshness tests
└── scanning/                   # LicenseResolver tests
```

### Adding a New Ecosystem Parser

1. Create `src/scanning/parsers/MyParser.ts` implementing `IParser`:

```typescript
import { IParser } from "./IParser";
import { ParsedDependency, Ecosystem } from "@/models/types";

export class MyParser implements IParser {
  readonly ecosystem = Ecosystem.MyEco;      // Add to Ecosystem enum first
  readonly filePatterns = [/myfile\.lock$/i];

  parse(repoName: string, filePath: string, content: string): ParsedDependency[] {
    // Parse the file content and return dependencies
    return [];
  }
}
```

2. Register it in `ScanOrchestrator.ts`:

```typescript
this.parsers = [
  ...existing parsers,
  new MyParser(),
];
```

3. Add known license mappings to `LicenseRegistry.ts`
4. Add file patterns to `Constants.ts` `DEPENDENCY_FILE_PATTERNS`
5. Write tests in `tests/parsers/MyParser.test.ts`

---

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Tests use Jest with ts-jest and mock the Azure DevOps SDK. Coverage targets:

| Metric | Target |
|--------|--------|
| Branches | 50% |
| Functions | 60% |
| Lines | 60% |
| Statements | 60% |

### Test Structure

```
tests/
├── __mocks__/
│   └── azure-devops-extension-sdk.ts    # SDK mock (init, getService, etc.)
├── parsers/
│   ├── NuGetParser.test.ts              # .csproj, packages.config variants
│   ├── NpmParser.test.ts               # package.json, lock v1/v2/v3
│   ├── GoParser.test.ts                # go.mod require blocks
│   ├── PythonParser.test.ts            # requirements.txt, pyproject.toml
│   └── MavenParser.test.ts             # pom.xml dependency extraction
├── analysis/
│   ├── PolicyEngine.test.ts            # Default policy, overrides, exclusions
│   ├── SbomGenerator.test.ts           # CycloneDX output, purl formats
│   └── FreshnessAnalyzer.test.ts       # Cross-repo version tracking
└── scanning/
    └── LicenseResolver.test.ts         # 3-tier resolution, SPDX normalization
```

---

## CI/CD

GitHub Actions runs on every push to `main`/`master` and on pull requests:

```
┌─────────────────────────────────────────────┐
│  CI Pipeline (.github/workflows/ci.yml)      │
│                                               │
│  1. Checkout code                             │
│  2. Setup Node.js 20 (with npm cache)         │
│  3. npm ci --legacy-peer-deps                 │
│  4. npm test          ← Jest suite            │
│  5. npm run build     ← Webpack production    │
│  6. npm run package   ← tfx create .vsix      │
│  7. Upload .vsix artifact                      │
└─────────────────────────────────────────────┘
```

---

## Publishing

### Package the Extension

```bash
npm run package
# Creates out/allpay-adam.license-sbom-scanner-1.0.0.vsix
```

### Publish to Marketplace

Upload the `.vsix` to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) or publish directly:

```bash
npm run publish:marketplace
```

### Install in Azure DevOps

Once published, the extension adds a **Compliance** hub under **Repos** in every project:

```
Azure DevOps  ▸  Repos  ▸  Compliance
```

The extension requires the `vso.code` scope (read access to Git repositories) and no additional configuration to get started.

---

## Data Flow Summary

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Git Repos   │────▶│  File Trees   │────▶│  Dependency   │
│   (API)       │     │  (filtered)   │     │  Files        │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                   │
                      ┌────────────────────────────▼───────────────┐
                      │              PARSERS                        │
                      │  NuGet │ npm │ Go │ Python │ Maven          │
                      └────────────────────────────┬───────────────┘
                                                   │
                                          ParsedDependency[]
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │      LICENSE RESOLVER        │
                                    │  declared → registry → unknown│
                                    └──────────────┬──────────────┘
                                                   │
                                          ResolvedDependency[]
                                                   │
                              ┌─────────────────────┼─────────────────────┐
                              │                     │                     │
                     ┌────────▼──────┐    ┌─────────▼──────┐    ┌────────▼──────┐
                     │ POLICY ENGINE │    │  FRESHNESS     │    │ SBOM          │
                     │ violations    │    │  ANALYZER      │    │ GENERATOR     │
                     └────────┬──────┘    └─────────┬──────┘    └────────┬──────┘
                              │                     │                     │
                     PolicyViolation[]    FreshnessResult[]      SbomDocument
                              │                     │                     │
                              └─────────────────────┼─────────────────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │ RepoScanResult  │
                                           │   per repository │
                                           └────────┬────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │ FullScanResult  │
                                           │  (all repos)    │
                                           └────────┬────────┘
                                                    │
                                                    ▼
                                              React UI
```

---

## License

See [LICENSE](LICENSE) for details.
