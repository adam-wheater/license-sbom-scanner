module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^azure-devops-extension-api(.*)$":
      "<rootDir>/tests/__mocks__/azure-devops-extension-api.ts",
    "^azure-devops-extension-sdk$":
      "<rootDir>/tests/__mocks__/azure-devops-extension-sdk.ts",
  },
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.tsx",
    "!src/ComplianceHub/**",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
