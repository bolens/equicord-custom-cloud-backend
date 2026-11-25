import { readFileSync } from "node:fs";

const subject = readFileSync(process.argv[2], "utf8").split("\n")[0];
if (!/^(feat|fix|docs|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_-]+\))?!?: .+/.test(subject)) {
    console.error("Use a Conventional Commit subject, for example: feat: add custom cloud backend.");
    process.exitCode = 1;
}
