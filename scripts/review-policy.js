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

function main() {
  const changedFiles = getChangedFiles();
  const sourceChanged = changedFiles.some((file) => file.startsWith("src/"));
  const testsChanged = changedFiles.some((file) => file.startsWith("tests/"));

  if (!sourceChanged) {
    console.log("Review policy passed: no source changes detected.");
    return;
  }

  if (!testsChanged) {
    console.error(
      "Review policy failed: changes in src/ must include at least one updated file in tests/."
    );
    process.exit(1);
  }

  console.log("Review policy passed: source changes include test updates.");
}

main();
