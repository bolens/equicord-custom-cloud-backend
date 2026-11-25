import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, git, lock } from "./upstream.mjs";
import { apply } from "./apply.mjs";

const checkout = join(ROOT, ".cache/Equicord");
mkdirSync(dirname(checkout), { recursive: true });
if (!existsSync(checkout)) {
    mkdirSync(checkout);
    git(checkout, ["init", "--quiet"]);
    git(checkout, ["remote", "add", "origin", lock.repository]);
    git(checkout, ["fetch", "--depth=1", "origin", lock.revision]);
    git(checkout, ["checkout", "--quiet", "--detach", "FETCH_HEAD"]);
}
if (!git(checkout, ["remote"]).split("\n").includes("origin")) {
    git(checkout, ["remote", "add", "origin", lock.repository]);
}
if (git(checkout, ["remote", "get-url", "origin"]) !== lock.repository)
    throw new Error("Unexpected upstream cache remote.");
apply(checkout);
const require = createRequire(import.meta.url);
const pnpm = join(dirname(require.resolve("pnpm/package.json")), "bin/pnpm.mjs");
function run(args) {
    const result = spawnSync(process.execPath, [pnpm, ...args], { cwd: checkout, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}
run(["install", "--frozen-lockfile"]);
run(["testTsc"]);
run([
    "exec",
    "oxlint",
    "src/userplugins/customCloudBackend/index.tsx",
    "src/api/SettingsSync/cloudSetup.tsx",
    "src/components/settings/tabs/sync/CloudTab.tsx",
    "src/utils/constants.ts"
]);
run(["build", "--standalone", "--disable-updater"]);
console.log(
    "Pinned Equicord typecheck, changed-source lint and desktop build passed. Nothing was installed or launched."
);
