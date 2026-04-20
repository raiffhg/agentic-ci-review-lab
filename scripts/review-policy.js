const { execFileSync } = require("node:child_process");
const { appendFileSync } = require("node:fs");

/**
 * Run the `git` command with the given arguments and return its stdout as a list of non-empty, trimmed lines.
 * @param {string[]} args - Arguments to pass to the `git` executable (e.g., `["diff", "--name-only", "base", "head"]`).
 * @returns {string[]} An array of stdout lines with surrounding whitespace removed; empty lines are omitted.
 */
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

/**
 * Determine the list of files changed between two commits for the review context.
 *
 * Reads the target commit SHA from `REVIEW_HEAD_SHA` (defaults to `HEAD`) and the base commit SHA from `REVIEW_BASE_SHA`.
 * If `REVIEW_BASE_SHA` is missing or equals all-zero SHA, attempts to diff `HEAD~1` against the head; if that fallback diff fails,
 * logs a brief message and returns an empty array.
 *
 * @returns {string[]} An array of changed file paths (each path is a trimmed string). Exceptions from `execGit` may propagate
 *                     when a base commit is present and the diff command fails.
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

/**
 * Checks whether any changed file path begins with the given prefix.
 * @param {string[]} changedFiles - Array of changed file paths.
 * @param {string} prefix - Path prefix to test against each changed file.
 * @returns {boolean} `true` if at least one file path starts with `prefix`, `false` otherwise.
 */
function hasMatch(changedFiles, prefix) {
  return changedFiles.some((file) => file.startsWith(prefix));
}

/**
 * Evaluates repository review policies against a list of changed file paths.
 *
 * @param {string[]} changedFiles - Changed file paths relative to the repository root.
 * @returns {{name: string, passed: boolean, message: string}[]} An array of policy result objects containing the policy `name`, a boolean `passed` flag, and a human-readable `message`.
 */
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

/**
 * Build a markdown summary listing changed files and policy results.
 * @param {string[]} changedFiles - Array of changed file paths to list; may be empty.
 * @param {{name: string, passed: boolean, message: string}[]} results - Array of policy result objects to render; may be empty.
 * @returns {string} The markdown-formatted summary with a trailing newline.
 */
function formatSummary(changedFiles, results) {
  const lines = ["## Review Policy Summary", ""];

  if (changedFiles.length === 0) {
    lines.push("- No changed files detected.");
  } else {
    lines.push("### Changed Files", "");

    for (const file of changedFiles) {
      lines.push(`- \`${file}\``);
    }
  }

  lines.push("");
  lines.push("### Policy Results", "");

  if (results.length === 0) {
    lines.push("- No policy checks were triggered.");
    return `${lines.join("\n")}\n`;
  }

  for (const result of results) {
    const icon = result.passed ? "PASS" : "FAIL";
    lines.push(`- **${icon}** \`${result.name}\`: ${result.message}`);
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Append the review policy markdown summary to the GitHub Actions step summary file when configured.
 *
 * If the GITHUB_STEP_SUMMARY environment variable is not set, the function returns without side effects.
 * @param {string[]} changedFiles - List of changed file paths to include in the summary.
 * @param {Array<{name: string, passed: boolean, message: string}>} results - Policy results to include in the summary.
 */
function writeStepSummary(changedFiles, results) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;

  if (!summaryFile) {
    return;
  }

  appendFileSync(summaryFile, formatSummary(changedFiles, results), "utf8");
}

/**
 * Log policy outcomes and indicate the overall pass status.
 *
 * When run inside GitHub Actions (GITHUB_ACTIONS === "true"), emits
 * Actions notice/error annotations for each policy result.
 *
 * @param {Array<{name: string, passed: boolean, message: string}>} results - Policy results to report.
 * @returns {boolean} `true` if all policies passed or no policies were triggered, `false` if any policy failed.
 */
function reportResults(results) {
  if (results.length === 0) {
    console.log("Review policy passed: no policy checks were triggered.");
    return true;
  }

  let hasFailures = false;

  for (const result of results) {
    if (result.passed) {
      console.log(`Policy passed [${result.name}]: ${result.message}`);
      if (process.env.GITHUB_ACTIONS === "true") {
        console.log(
          `::notice title=Policy passed (${result.name})::${result.message}`
        );
      }
      continue;
    }

    hasFailures = true;
    console.error(`Review policy failed [${result.name}]: ${result.message}`);

    if (process.env.GITHUB_ACTIONS === "true") {
      console.error(
        `::error title=Review policy failed (${result.name})::${result.message}`
      );
    }
  }

  return !hasFailures;
}

/**
 * Execute the end-to-end review policy check and reporting flow.
 *
 * Fetches changed files, evaluates configured policies, appends a step summary (when enabled),
 * and reports per-policy results. If any policy fails, the process is terminated with exit code 1.
 */
function main() {
  const changedFiles = getChangedFiles();
  const results = evaluatePolicies(changedFiles);
  writeStepSummary(changedFiles, results);
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
  formatSummary,
  getChangedFiles,
  reportResults,
  writeStepSummary,
};
