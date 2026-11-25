import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const temporary = mkdtempSync(join(tmpdir(), "cloud-staged-check-"));
try {
    execFileSync("git", ["checkout-index", "--all", `--prefix=${temporary}/`], { cwd: root });
    execFileSync("gitleaks", ["dir", temporary, "--redact", "--no-banner"], { stdio: "inherit" });
    symlinkSync(join(root, "node_modules"), join(temporary, "node_modules"), "dir");
    execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "check"], {
        cwd: temporary,
        stdio: "inherit"
    });
} finally {
    rmSync(temporary, { recursive: true, force: true });
}
