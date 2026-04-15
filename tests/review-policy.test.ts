const { evaluatePolicies, formatSummary } =
  require("../scripts/review-policy") as {
    evaluatePolicies: (
      changedFiles: string[]
    ) => Array<{ name: string; passed: boolean; message: string }>;
    formatSummary: (
      changedFiles: string[],
      results: Array<{ name: string; passed: boolean; message: string }>
    ) => string;
  };

describe("review policy", () => {
  it("passes when no policy-triggering files changed", () => {
    expect(evaluatePolicies(["README.md"])).toEqual([]);
  });

  it("requires tests when source files change", () => {
    expect(evaluatePolicies(["src/app.ts"])).toEqual([
      {
        name: "source-requires-tests",
        passed: false,
        message:
          "Changes in src/ must include at least one updated file in tests/.",
      },
    ]);
  });

  it("passes source policy when source and tests change together", () => {
    expect(evaluatePolicies(["src/app.ts", "tests/server.test.ts"])).toEqual([
      {
        name: "source-requires-tests",
        passed: true,
        message:
          "Changes in src/ must include at least one updated file in tests/.",
      },
    ]);
  });

  it("requires the lockfile when package.json changes", () => {
    expect(evaluatePolicies(["package.json"])).toEqual([
      {
        name: "package-requires-lockfile",
        passed: false,
        message:
          "Changes in package.json must include a matching update to package-lock.json.",
      },
    ]);
  });

  it("requires documentation when workflows change", () => {
    expect(evaluatePolicies([".github/workflows/ci.yml"])).toEqual([
      {
        name: "workflow-requires-docs",
        passed: false,
        message:
          "Workflow changes must be documented in README.md or the docs/ folder.",
      },
    ]);
  });

  it("can report multiple policies in one change set", () => {
    expect(
      evaluatePolicies(["src/app.ts", "package.json", "tests/server.test.ts"])
    ).toEqual([
      {
        name: "source-requires-tests",
        passed: true,
        message:
          "Changes in src/ must include at least one updated file in tests/.",
      },
      {
        name: "package-requires-lockfile",
        passed: false,
        message:
          "Changes in package.json must include a matching update to package-lock.json.",
      },
    ]);
  });

  it("formats a GitHub step summary with changed files and policy results", () => {
    const summary = formatSummary(
      ["src/app.ts", "tests/server.test.ts"],
      [
        {
          name: "source-requires-tests",
          passed: true,
          message:
            "Changes in src/ must include at least one updated file in tests/.",
        },
      ]
    );

    expect(summary).toContain("## Review Policy Summary");
    expect(summary).toContain("- `src/app.ts`");
    expect(summary).toContain("**PASS** `source-requires-tests`");
  });
});
