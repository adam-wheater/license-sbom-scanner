import { GoParser } from "@/scanning/parsers/GoParser";
import { Ecosystem, DependencyScope } from "@/models/types";

describe("GoParser", () => {
  let parser: GoParser;

  beforeEach(() => {
    parser = new GoParser();
  });

  test("parses go.mod with require block", () => {
    const content = `module github.com/myorg/myapp

go 1.21

require (
\tgithub.com/gin-gonic/gin v1.9.1
\tgithub.com/stretchr/testify v1.8.4
\tgoogle.golang.org/grpc v1.59.0
)

require (
\tgithub.com/davecgh/go-spew v1.1.1 // indirect
)`;

    const deps = parser.parse("my-repo", "/go.mod", content);
    expect(deps).toHaveLength(4);
    expect(deps[0]).toMatchObject({
      name: "github.com/gin-gonic/gin",
      version: "v1.9.1",
      ecosystem: Ecosystem.Go,
      scope: DependencyScope.Runtime,
    });
    expect(deps[3]).toMatchObject({
      name: "github.com/davecgh/go-spew",
      version: "v1.1.1",
      scope: DependencyScope.Optional, // indirect
    });
  });

  test("parses single-line require", () => {
    const content = `module github.com/myorg/myapp

go 1.21

require github.com/spf13/cobra v1.8.0`;

    const deps = parser.parse("repo", "/go.mod", content);
    expect(deps).toHaveLength(1);
    expect(deps[0]).toMatchObject({
      name: "github.com/spf13/cobra",
      version: "v1.8.0",
    });
  });

  test("skips comment lines in require block", () => {
    const content = `module myapp

require (
\t// This is a comment
\tgithub.com/foo/bar v1.0.0
)`;

    const deps = parser.parse("repo", "/go.mod", content);
    expect(deps).toHaveLength(1);
  });

  test("handles empty go.mod", () => {
    const deps = parser.parse("repo", "/go.mod", "module myapp\n\ngo 1.21");
    expect(deps).toHaveLength(0);
  });
});
