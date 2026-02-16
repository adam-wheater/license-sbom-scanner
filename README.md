# License & SBOM Scanner

Azure DevOps extension that scans repositories for dependency license compliance, policy violations, and generates CycloneDX SBOM documents.

## Supported Ecosystems

| Ecosystem | Files Scanned |
|-----------|--------------|
| **NuGet** | `.csproj`, `packages.config`, `Directory.Packages.props`, `.nuspec` |
| **npm** | `package.json`, `package-lock.json` |
| **Go** | `go.mod` |
| **Python** | `requirements*.txt`, `pyproject.toml`, `setup.py`, `setup.cfg`, `Pipfile` |
| **Maven** | `pom.xml` |

## Development

### Prerequisites

- Node.js >= 20
- npm

### Setup

```bash
npm install --legacy-peer-deps
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production webpack build |
| `npm run build:dev` | Development build with source maps |
| `npm test` | Run Jest test suite |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run package` | Create .vsix extension package |

### Project Structure

```
src/
  ComplianceHub/        # Entry point (SDK init + React mount)
  components/           # React UI components
  scanning/
    parsers/            # Ecosystem parsers (NuGet, npm, Go, Python, Maven)
    ScanOrchestrator.ts # Main scan coordinator
    LicenseResolver.ts  # 3-tier license resolution
    FileDiscovery.ts    # Git tree file discovery
    FileContentFetcher.ts
  analysis/
    PolicyEngine.ts     # License policy evaluation
    FreshnessAnalyzer.ts # Cross-repo version tracking
    SbomGenerator.ts    # CycloneDX 1.5 JSON generation
  models/
    types.ts            # TypeScript interfaces and enums
    LicenseRegistry.ts  # Built-in license mappings (800+ packages)
  services/             # Extension Data Service persistence
  hooks/                # React hooks
  utils/                # ApiClient, ConcurrencyLimiter, theme, constants
tests/
  parsers/              # Parser unit tests
  analysis/             # PolicyEngine, SbomGenerator, FreshnessAnalyzer tests
  scanning/             # LicenseResolver tests
  __mocks__/            # Azure DevOps SDK mocks
```

### Architecture

The extension follows the same architecture as [repo-dependency-mapper](https://github.com/adam-wheater/repo-dependency-mapper):

- TypeScript strict mode with ES2020 target
- React 18 with `createRoot` and functional components
- All inline styles (no CSS files)
- Single `ms.vss-web.hub` contribution under Repos
- Webpack 5 with ts-loader and `@/` path alias
- Azure DevOps Extension Data Service for settings persistence
- Dark/light theme via MutationObserver on Azure DevOps body class

### License Resolution

Licenses are resolved using a 3-tier strategy:

1. **File metadata**: Extracted from `<PackageLicenseExpression>` in .csproj, `license` field in package.json, `<license>` in pom.xml, etc.
2. **Built-in registry**: Static lookup table mapping 800+ common packages to their SPDX license IDs
3. **Unknown fallback**: Packages not found in either tier are marked as "Unknown" (triggering a policy warning)

### Publishing

```bash
npm run package
# Upload out/*.vsix to https://marketplace.visualstudio.com/manage
```

Or publish directly:

```bash
npm run publish:marketplace
```
