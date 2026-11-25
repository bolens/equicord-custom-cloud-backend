import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const lock = JSON.parse(readFileSync(join(ROOT, "upstream.lock.json"), "utf8"));
export const hash = value => createHash("sha256").update(value).digest("hex");
export const pluginPath = "src/userplugins/customCloudBackend/index.tsx";
export const git = (cwd, args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

export function sources() {
    if (!/^[a-f0-9]{40}$/.test(lock.revision)) throw new Error("Invalid upstream revision.");
    const patch = readFileSync(join(ROOT, "patches/equicord.patch"));
    if (hash(patch) !== lock.patch_sha256) throw new Error("Integration patch does not match its lock.");
    const temporary = mkdtempSync(join(tmpdir(), "equicord-patch-"));
    const originals = new Map();
    const patched = new Map();
    try {
        for (const [path, pins] of Object.entries(lock.files)) {
            if (!path.startsWith("src/") || path.includes("..") || path.includes("\\"))
                throw new Error("Invalid upstream source path.");
            const data = readFileSync(join(ROOT, "fixtures/upstream", path));
            if (hash(data) !== pins.original_sha256) throw new Error(`Upstream fixture changed: ${path}`);
            originals.set(path, data);
            mkdirSync(dirname(join(temporary, path)), { recursive: true });
            writeFileSync(join(temporary, path), data);
        }
        git(temporary, ["apply", "--check", join(ROOT, "patches/equicord.patch")]);
        git(temporary, ["apply", join(ROOT, "patches/equicord.patch")]);
        for (const [path, pins] of Object.entries(lock.files)) {
            const data = readFileSync(join(temporary, path));
            if (hash(data) !== pins.patched_sha256) throw new Error(`Patched fixture changed: ${path}`);
            patched.set(path, data);
        }
        return { originals, patched };
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
}
