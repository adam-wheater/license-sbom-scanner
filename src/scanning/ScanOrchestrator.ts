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
} from "@/models/types";

export class ScanOrchestrator {
  private parsers: IParser[];
  private licenseResolver: LicenseResolver;
  private policyEngine: PolicyEngine;
  private freshnessAnalyzer: FreshnessAnalyzer;
  private sbomGenerator: SbomGenerator;
  private onProgress?: (progress: ScanProgress) => void;

  constructor(policy?: LicensePolicy, onProgress?: (progress: ScanProgress) => void) {
    this.parsers = [
      new NuGetParser(),
      new NpmParser(),
      new GoParser(),
      new PythonParser(),
      new MavenParser(),
    ];
    this.licenseResolver = new LicenseResolver();
    this.policyEngine = new PolicyEngine(policy);
    this.freshnessAnalyzer = new FreshnessAnalyzer();
    this.sbomGenerator = new SbomGenerator();
    this.onProgress = onProgress;
  }

  async scan(): Promise<FullScanResult> {
    const startTime = Date.now();
    this.freshnessAnalyzer.reset();

    // Resolve project
    const projectService = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService
    );
    const projectInfo = await projectService.getProject();
    if (!projectInfo) {
      throw new Error("Could not determine the current project.");
    }
    const project = projectInfo.name;

    // Fetch all repos
    this.reportProgress("discovery", 0, 0, "", "Fetching repositories...");
    const repos = await ApiClient.getRepositories(project);
    const allRepoNames = repos.map((r) => r.name);

    // Scan repos concurrently
    const repoLimiter = new ConcurrencyLimiter(MAX_CONCURRENT_REPOS);
    const results: RepoScanResult[] = [];
    let completed = 0;
    const failedRepos: string[] = [];

    this.reportProgress("scanning", repos.length, 0, "", "Scanning repositories...");

    await repoLimiter.map(repos, async (repo) => {
      try {
        this.reportProgress(
          "scanning",
          repos.length,
          completed,
          repo.name,
          `Scanning ${repo.name}...`
        );

        // Phase 1: Discover dependency files
        const discovered = await discoverFiles(repo.id, project);
        if (discovered.dependencyFiles.length === 0) {
          completed++;
          return;
        }

        // Phase 2: Fetch file contents
        const fileContents = await fetchFileContents(
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

    return {
      repos: results,
      allRepoNames,
      totalDependencies: results.reduce((sum, r) => sum + r.dependencies.length, 0),
      totalViolations: results.reduce((sum, r) => sum + r.violations.length, 0),
      scanDurationMs: Date.now() - startTime,
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
