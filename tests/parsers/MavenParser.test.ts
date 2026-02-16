import { MavenParser } from "@/scanning/parsers/MavenParser";
import { Ecosystem, DependencyScope } from "@/models/types";

describe("MavenParser", () => {
  let parser: MavenParser;

  beforeEach(() => {
    parser = new MavenParser();
  });

  test("parses pom.xml dependencies", () => {
    const content = `<?xml version="1.0"?>
<project>
  <dependencies>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
      <version>32.1.2-jre</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`;

    const deps = parser.parse("my-repo", "/pom.xml", content);
    expect(deps).toHaveLength(2);
    expect(deps[0]).toMatchObject({
      name: "com.google.guava:guava",
      version: "32.1.2-jre",
      ecosystem: Ecosystem.Maven,
      scope: DependencyScope.Runtime,
    });
    expect(deps[1]).toMatchObject({
      name: "org.junit.jupiter:junit-jupiter",
      scope: DependencyScope.Test,
    });
  });

  test("extracts and normalizes project license", () => {
    const content = `<project>
  <licenses>
    <license>
      <name>Apache License, Version 2.0</name>
    </license>
  </licenses>
  <dependencies>
    <dependency>
      <groupId>org.slf4j</groupId>
      <artifactId>slf4j-api</artifactId>
      <version>2.0.9</version>
    </dependency>
  </dependencies>
</project>`;

    const deps = parser.parse("repo", "/pom.xml", content);
    expect(deps).toHaveLength(1);
    expect(deps[0].declaredLicense).toBe("Apache-2.0");
  });

  test("handles provided and system scopes", () => {
    const content = `<project>
  <dependencies>
    <dependency>
      <groupId>javax.servlet</groupId>
      <artifactId>javax.servlet-api</artifactId>
      <version>4.0.1</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
</project>`;

    const deps = parser.parse("repo", "/pom.xml", content);
    expect(deps[0].scope).toBe(DependencyScope.Optional);
  });

  test("excludes dependencyManagement entries", () => {
    const content = `<project>
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-dependencies</artifactId>
        <version>3.2.0</version>
      </dependency>
    </dependencies>
  </dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.2.0</version>
    </dependency>
  </dependencies>
</project>`;

    const deps = parser.parse("repo", "/pom.xml", content);
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe("org.springframework.boot:spring-boot-starter-web");
  });

  test("handles missing version", () => {
    const content = `<project>
  <dependencies>
    <dependency>
      <groupId>org.foo</groupId>
      <artifactId>bar</artifactId>
    </dependency>
  </dependencies>
</project>`;

    const deps = parser.parse("repo", "/pom.xml", content);
    expect(deps).toHaveLength(1);
    expect(deps[0].version).toBe("*");
  });
});
