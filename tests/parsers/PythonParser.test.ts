import { PythonParser } from "@/scanning/parsers/PythonParser";
import { Ecosystem, DependencyScope } from "@/models/types";

describe("PythonParser", () => {
  let parser: PythonParser;

  beforeEach(() => {
    parser = new PythonParser();
  });

  test("parses requirements.txt", () => {
    const content = `# Main dependencies
requests==2.31.0
flask>=2.3.0
sqlalchemy~=2.0
celery
# Options
-r requirements-base.txt
--index-url https://pypi.org/simple`;

    const deps = parser.parse("repo", "/requirements.txt", content);
    expect(deps).toHaveLength(4);
    expect(deps[0]).toMatchObject({
      name: "requests",
      version: "2.31.0",
      ecosystem: Ecosystem.Python,
      scope: DependencyScope.Runtime,
    });
    expect(deps[3]).toMatchObject({
      name: "celery",
      version: "*",
    });
  });

  test("detects dev requirements from filename", () => {
    const content = `pytest==7.4.0
pytest-cov>=4.0`;

    const deps = parser.parse("repo", "/requirements-dev.txt", content);
    expect(deps).toHaveLength(2);
    expect(deps[0].scope).toBe(DependencyScope.Dev);
  });

  test("parses pyproject.toml dependencies", () => {
    const content = `[project]
name = "my-app"
dependencies = [
  "fastapi>=0.100.0",
  "uvicorn>=0.23.0",
  "pydantic>=2.0",
]

[project.optional-dependencies]
test = [
  "pytest>=7.0",
  "httpx>=0.24",
]`;

    const deps = parser.parse("repo", "/pyproject.toml", content);
    expect(deps).toHaveLength(5);
    expect(deps[0]).toMatchObject({
      name: "fastapi",
      version: "0.100.0",
      scope: DependencyScope.Runtime,
    });
    expect(deps[3]).toMatchObject({
      name: "pytest",
      scope: DependencyScope.Dev,
    });
  });

  test("parses Pipfile", () => {
    const content = `[packages]
requests = "==2.31.0"
flask = "*"

[dev-packages]
pytest = ">=7.0"`;

    const deps = parser.parse("repo", "/Pipfile", content);
    expect(deps).toHaveLength(3);
    expect(deps[0]).toMatchObject({
      name: "requests",
      version: "2.31.0",
      scope: DependencyScope.Runtime,
    });
    expect(deps[2]).toMatchObject({
      name: "pytest",
      scope: DependencyScope.Dev,
    });
  });

  test("parses setup.py install_requires", () => {
    const content = `from setuptools import setup

setup(
    name="myapp",
    install_requires=[
        "requests>=2.28",
        "click>=8.0",
    ],
    tests_require=[
        "pytest>=7.0",
    ],
)`;

    const deps = parser.parse("repo", "/setup.py", content);
    expect(deps).toHaveLength(3);
    expect(deps[0].scope).toBe(DependencyScope.Runtime);
    expect(deps[2].scope).toBe(DependencyScope.Test);
  });

  test("normalizes package names", () => {
    const content = `Django==4.2.0
scikit_learn>=1.3.0
my.package>=1.0`;

    const deps = parser.parse("repo", "/requirements.txt", content);
    expect(deps[0].name).toBe("django");
    expect(deps[1].name).toBe("scikit-learn");
    expect(deps[2].name).toBe("my-package");
  });
});
