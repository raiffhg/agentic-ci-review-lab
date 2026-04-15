const { execFileSync } = require("node:child_process");

function execGit(args) {
  const output = execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getChangedFiles() {
  const head = process.env.REVIEW_HEAD_SHA || "HEAD";
  const base = process.env.REVIEW_BASE_SHA;

  if (!base || base === "0000000000000000000000000000000000000000") {
    try {
      return execGit(["diff", "--name-only", "HEAD~1", head]);
    } catch (_error) {
      console.log("Skipping review policy: no base commit available yet.");
      return [];
    }
  }

  return execGit(["diff", "--name-only", base, head]);
}

function hasMatch(changedFiles, prefix) {
  return changedFiles.some((file) => file.startsWith(prefix));
}

function evaluatePolicies(changedFiles) {
  const results = [];

  if (hasMatch(changedFiles, "src/")) {
    results.push({
      name: "source-requires-tests",
      passed: hasMatch(changedFiles, "tests/"),
      message:
        "Changes in src/ must include at least one updated file in tests/.",
    });
  }

  if (changedFiles.includes("package.json")) {
    results.push({
      name: "package-requires-lockfile",
      passed: changedFiles.includes("package-lock.json"),
      message:
        "Changes in package.json must include a matching update to package-lock.json.",
    });
  }

  if (hasMatch(changedFiles, ".github/workflows/")) {
    results.push({
      name: "workflow-requires-docs",
      passed:
        changedFiles.includes("README.md") || hasMatch(changedFiles, "docs/"),
      message:
        "Workflow changes must be documented in README.md or the docs/ folder.",
    });
  }

  return results;
}

function reportResults(results) {
  if (results.length === 0) {
    console.log("Review policy passed: no policy checks were triggered.");
    return true;
  }

  let hasFailures = false;

  for (const result of results) {
    if (result.passed) {
      console.log(`Policy passed [${result.name}]: ${result.message}`);
      continue;
    }

    hasFailures = true;
    console.error(`Review policy failed [${result.name}]: ${result.message}`);

    if (process.env.GITHUB_ACTIONS === "true") {
      console.error(`::error title=Review policy failed::${result.message}`);
    }
  }

  return !hasFailures;
}

function main() {
  const changedFiles = getChangedFiles();
  const results = evaluatePolicies(changedFiles);
  const passed = reportResults(results);

  if (!passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  evaluatePolicies,
  getChangedFiles,
  reportResults,
};
