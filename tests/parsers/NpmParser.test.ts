import { NpmParser } from "@/scanning/parsers/NpmParser";
import { Ecosystem, DependencyScope } from "@/models/types";

describe("NpmParser", () => {
  let parser: NpmParser;

  beforeEach(() => {
    parser = new NpmParser();
  });

  test("parses package.json dependencies with scopes", () => {
    const content = JSON.stringify({
      name: "my-app",
      license: "MIT",
      dependencies: {
        react: "^18.2.0",
        express: "^4.18.2",
      },
      devDependencies: {
        jest: "^29.7.0",
        typescript: "^5.4.5",
      },
      peerDependencies: {
        "react-dom": "^18.0.0",
      },
    });

    const deps = parser.parse("my-repo", "/package.json", content);
    expect(deps).toHaveLength(5);

    expect(deps[0]).toMatchObject({
      name: "react",
      version: "^18.2.0",
      ecosystem: Ecosystem.Npm,
      scope: DependencyScope.Runtime,
      declaredLicense: "MIT",
    });
    expect(deps[2]).toMatchObject({
      name: "jest",
      scope: DependencyScope.Dev,
    });
    expect(deps[4]).toMatchObject({
      name: "react-dom",
      scope: DependencyScope.Peer,
    });
  });

  test("skips files inside node_modules", () => {
    const content = JSON.stringify({
      dependencies: { lodash: "^4.17.21" },
    });

    const deps = parser.parse("repo", "/node_modules/foo/package.json", content);
    expect(deps).toHaveLength(0);
  });

  test("parses package-lock.json v2/v3 format", () => {
    const content = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "my-app", version: "1.0.0" },
        "node_modules/react": { version: "18.2.0", license: "MIT" },
        "node_modules/express": { version: "4.18.2", dev: true },
      },
    });

    const deps = parser.parse("repo", "/package-lock.json", content);
    expect(deps).toHaveLength(2);
    expect(deps[0]).toMatchObject({
      name: "react",
      version: "18.2.0",
      scope: DependencyScope.Runtime,
      declaredLicense: "MIT",
    });
    expect(deps[1]).toMatchObject({
      name: "express",
      version: "4.18.2",
      scope: DependencyScope.Dev,
    });
  });

  test("handles invalid JSON gracefully", () => {
    expect(parser.parse("repo", "/package.json", "not json")).toHaveLength(0);
    expect(parser.parse("repo", "/package-lock.json", "{broken")).toHaveLength(0);
  });

  test("handles license as object", () => {
    const content = JSON.stringify({
      license: { type: "Apache-2.0", url: "https://example.com" },
      dependencies: { foo: "1.0.0" },
    });

    const deps = parser.parse("repo", "/package.json", content);
    expect(deps[0].declaredLicense).toBe("Apache-2.0");
  });
});
