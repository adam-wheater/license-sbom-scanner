import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, IProjectPageService } from "azure-devops-extension-api";
import * as ApiClient from "@/utils/ApiClient";
import { ConcurrencyLimiter } from "@/utils/ConcurrencyLimiter";
import { MAX_CONCURRENT_REPOS } from "@/utils/Constants";
import { discoverFiles } from "./FileDiscovery";
import { fetchFileContents } from "./FileContentFetcher";
import { IParser } from "./parsers/IParser";
import { NuGetParser } from "./parsers/NuGetParser";
import { NpmParser } from "./parsers/NpmParser";
import { GoParser } from "./parsers/GoParser";
import { PythonParser } from "./parsers/PythonParser";
import { MavenParser } from "./parsers/MavenParser";
import { LicenseResolver } from "./LicenseResolver";
import { PolicyEngine } from "@/analysis/PolicyEngine";
import { FreshnessAnalyzer } from "@/analysis/FreshnessAnalyzer";
import { SbomGenerator } from "@/analysis/SbomGenerator";
import {
  ScanProgress,
  FullScanResult,
  RepoScanResult,
  LicensePolicy,
  ParsedDependency,
  InternalPackageInfo,
  VersionInconsistency,
  Ecosystem,
} from "@/models/types";

export interface ScanOrchestratorDeps {
  parsers?: IParser[];
  licenseResolver?: LicenseResolver;
  policyEngine?: PolicyEngine;
  freshnessAnalyzer?: FreshnessAnalyzer;
  sbomGenerator?: SbomGenerator;
  getProject?: () => Promise<string>;
  getRepositories?: (project: string) => Promise<{ id: string; name: string }[]>;
  discoverFiles?: (repoId: string, project: string) => Promise<{ dependencyFiles: any[] }>;
  fetchFileContents?: (repoId: string, project: string, files: any[]) => Promise<{ path: string; content: string }[]>;
}

export class ScanOrchestrator {
  private parsers: IParser[];
  private nugetParser: NuGetParser;
  private licenseResolver: LicenseResolver;
  private policyEngine: PolicyEngine;
  private freshnessAnalyzer: FreshnessAnalyzer;
  private sbomGenerator: SbomGenerator;
  private onProgress?: (progress: ScanProgress) => void;
  private abortController?: AbortController;
  private _getProject: () => Promise<string>;
  private _getRepositories: (project: string) => Promise<{ id: string; name: string }[]>;
  private _discoverFiles: (repoId: string, project: string) => Promise<{ dependencyFiles: any[] }>;
  private _fetchFileContents: (repoId: string, project: string, files: any[]) => Promise<{ path: string; content: string }[]>;

  constructor(
    policy?: LicensePolicy,
    onProgress?: (progress: ScanProgress) => void,
    deps?: ScanOrchestratorDeps
  ) {
    this.nugetParser = new NuGetParser();
    this.parsers = deps?.parsers ?? [
      this.nugetParser,
      new NpmParser(),
      new GoParser(),
      new PythonParser(),
      new MavenParser(),
    ];
    this.licenseResolver = deps?.licenseResolver ?? new LicenseResolver();
    this.policyEngine = deps?.policyEngine ?? new PolicyEngine(policy);
    this.freshnessAnalyzer = deps?.freshnessAnalyzer ?? new FreshnessAnalyzer();
    this.sbomGenerator = deps?.sbomGenerator ?? new SbomGenerator();
    this.onProgress = onProgress;

    this._getProject = deps?.getProject ?? (async () => {
      const projectService = await SDK.getService<IProjectPageService>(
        CommonServiceIds.ProjectPageService
      );
      const projectInfo = await projectService.getProject();
      if (!projectInfo) {
        throw new Error("Could not determine the current project.");
      }
      return projectInfo.name;
    });
    this._getRepositories = deps?.getRepositories ?? ((project: string) => ApiClient.getRepositories(project));
    this._discoverFiles = deps?.discoverFiles ?? discoverFiles;
    this._fetchFileContents = deps?.fetchFileContents ?? fetchFileContents;
  }

  abort(): void {
    this.abortController?.abort();
  }

  async scan(): Promise<FullScanResult> {
    const startTime = Date.now();
    this.freshnessAnalyzer.reset();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Resolve project
    const project = await this._getProject();

    // Fetch all repos
    this.reportProgress("discovery", 0, 0, "", "Fetching repositories...");
    if (signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
    const repos = await this._getRepositories(project);
    const allRepoNames = repos.map((r) => r.name);

    // Scan repos concurrently
    const repoLimiter = new ConcurrencyLimiter(MAX_CONCURRENT_REPOS);
    const results: RepoScanResult[] = [];
    let completed = 0;
    const failedRepos: string[] = [];

    this.reportProgress("scanning", repos.length, 0, "", "Scanning repositories...");

    await repoLimiter.map(repos, async (repo) => {
      try {
        if (signal.aborted) throw new DOMException("Scan cancelled", "AbortError");

        this.reportProgress(
          "scanning",
          repos.length,
          completed,
          repo.name,
          `Scanning ${repo.name}...`
        );

        // Phase 1: Discover dependency files
        const discovered = await this._discoverFiles(repo.id, project);
        if (discovered.dependencyFiles.length === 0) {
          completed++;
          return;
        }

        if (signal.aborted) throw new DOMException("Scan cancelled", "AbortError");

        // Phase 2: Fetch file contents
        const fileContents = await this._fetchFileContents(
          repo.id,
          project,
          discovered.dependencyFiles
        );

        // Phase 3: Parse all files
        const allParsed: ParsedDependency[] = [];
        for (const file of fileContents) {
          for (const parser of this.parsers) {
            if (parser.filePatterns.some((p) => p.test(file.path))) {
              try {
                const parsed = parser.parse(repo.name, file.path, file.content);
                allParsed.push(...parsed);
              } catch (err) {
                console.warn(`Parser error on ${file.path} in ${repo.name}:`, err);
              }
            }
          }
        }

        // Extract internal package IDs (packages this repo produces)
        const repoInternalPackages: string[] = [];
        for (const file of fileContents) {
          if (this.nugetParser.filePatterns.some((p) => p.test(file.path))) {
            try {
              const ids = this.nugetParser.extractProducedPackageIds(file.path, file.content);
              repoInternalPackages.push(...ids);
            } catch {
              // Ignore extraction errors
            }
          }
        }

        // Deduplicate: same ecosystem + name within a repo, keep the first occurrence
        const seen = new Set<string>();
        const deduped = allParsed.filter((dep) => {
          const key = `${dep.ecosystem}:${dep.name.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Phase 4: Resolve licenses
        const resolved = this.licenseResolver.resolve(deduped);

        // Phase 5: Evaluate policy
        const violations = this.policyEngine.evaluate(repo.name, resolved);

        // Phase 6: Analyze freshness
        const freshnessResults = this.freshnessAnalyzer.analyze(repo.name, resolved);

        // Phase 7: Generate SBOM
        const sbom = this.sbomGenerator.generate(repo.name, resolved);

        results.push({
          repoName: repo.name,
          repoId: repo.id,
          dependencies: resolved,
          violations,
          freshnessResults,
          sbom,
          scannedAt: new Date(),
          fileCount: fileContents.length,
          internalPackages: repoInternalPackages,
        });
      } catch (err) {
        console.warn(`Failed to scan repo ${repo.name}:`, err);
        failedRepos.push(repo.name);
      } finally {
        completed++;
        this.reportProgress(
          "scanning",
          repos.length,
          completed,
          "",
          `Scanned ${completed} of ${repos.length} repositories...`,
          failedRepos.length > 0 ? [...failedRepos] : undefined
        );
      }
    });

    this.reportProgress("complete", repos.length, repos.length, "", "Scan complete");

    // Sort: repos with violations first, then by dependency count
    results.sort((a, b) => {
      if (b.violations.length !== a.violations.length) {
        return b.violations.length - a.violations.length;
      }
      return b.dependencies.length - a.dependencies.length;
    });

    // Aggregate internal packages across all repos
    const allInternalPackages: InternalPackageInfo[] = [];
    for (const r of results) {
      for (const name of r.internalPackages) {
        allInternalPackages.push({ name, repoName: r.repoName, ecosystem: Ecosystem.NuGet });
      }
    }

    // Build inconsistencies from the freshness analyzer
    const rawInconsistencies = this.freshnessAnalyzer.getInconsistencies();
    const inconsistencies: VersionInconsistency[] = [];
    for (const [key, repoVersions] of rawInconsistencies) {
      const [ecosystem, ...nameParts] = key.split(":");
      const packageName = nameParts.join(":");
      const entries: { repoName: string; version: string }[] = [];
      for (const [repoName, versions] of repoVersions) {
        for (const version of versions) {
          entries.push({ repoName, version });
        }
      }
      // Determine if there's a major version difference
      const majors = new Set<number>();
      for (const entry of entries) {
        const match = entry.version.match(/^v?(\d+)/);
        if (match) majors.add(parseInt(match[1], 10));
      }
      inconsistencies.push({
        packageName,
        ecosystem,
        entries,
        hasMajorDifference: majors.size > 1,
      });
    }

    return {
      repos: results,
      allRepoNames,
      totalDependencies: results.reduce((sum, r) => sum + r.dependencies.length, 0),
      totalViolations: results.reduce((sum, r) => sum + r.violations.length, 0),
      scanDurationMs: Date.now() - startTime,
      internalPackages: allInternalPackages,
      inconsistencies,
    };
  }

  private reportProgress(
    phase: ScanProgress["phase"],
    total: number,
    completed: number,
    currentRepo: string,
    message: string,
    failedRepos?: string[]
  ): void {
    this.onProgress?.({
      phase,
      reposTotal: total,
      reposCompleted: completed,
      currentRepo,
      message,
      failedRepos,
    });
  }
}
