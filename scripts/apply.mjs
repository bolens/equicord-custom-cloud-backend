import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    realpathSync,
    renameSync,
    rmSync,
    unlinkSync,
    writeFileSync
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, git, hash, lock, pluginPath, sources } from "./upstream.mjs";

function assertSafe(root, path) {
    let current = root;
    for (const component of path.split("/")) {
        current = join(current, component);
        let entry;
        try {
            entry = lstatSync(current);
        } catch (error) {
            if (error.code === "ENOENT") continue;
            throw error;
        }
        if (entry.isSymbolicLink()) throw new Error(`Refusing symlink: ${path}`);
        if (current !== join(root, path) && !entry.isDirectory()) throw new Error(`Parent is not a directory: ${path}`);
    }
}

export function apply(checkout, { remove = false, check = false } = {}) {
    const root = realpathSync(checkout);
    if (realpathSync(git(root, ["rev-parse", "--show-toplevel"])) !== root)
        throw new Error("Pass the Equicord checkout root.");
    if (git(root, ["rev-parse", "HEAD"]) !== lock.revision)
        throw new Error("Unsupported Equicord revision. See upstream.lock.json.");
    const { originals, patched } = sources();
    const plugin = readFileSync(join(ROOT, "index.tsx"));
    const paths = [...originals.keys(), pluginPath];
    if (git(root, ["diff", "--cached", "--name-only", "--", ...paths]))
        throw new Error("Target files have staged changes.");
    const changes = [];
    for (const path of paths) {
        assertSafe(root, path);
        const target = join(root, path);
        const before = existsSync(target) ? readFileSync(target) : undefined;
        const original = originals.get(path);
        const installed = path === pluginPath ? plugin : patched.get(path);
        const wanted = remove ? original : installed;
        if (before && ![original, installed].some(data => data && hash(data) === hash(before)))
            throw new Error(`Edited target preserved: ${path}`);
        if (!before && original) throw new Error(`Missing upstream target: ${path}`);
        if ((!before && !wanted) || (before && wanted && hash(before) === hash(wanted))) continue;
        changes.push({ path, target, before, wanted });
    }
    if (check) return changes.map(change => change.path);
    for (const { path, target, before, wanted } of changes) {
        assertSafe(root, path);
        const current = existsSync(target) ? readFileSync(target) : undefined;
        if ((current === undefined) !== (before === undefined) || (before && !current.equals(before)))
            throw new Error(`Concurrent edit preserved: ${path}`);
        if (wanted === undefined) {
            unlinkSync(target);
        } else {
            mkdirSync(dirname(target), { recursive: true });
            const temporary = target + `.custom-cloud-${process.pid}.tmp`;
            try {
                writeFileSync(temporary, wanted, { flag: "wx" });
                renameSync(temporary, target);
            } finally {
                rmSync(temporary, { force: true });
            }
        }
    }
    return changes.map(change => relative(root, change.target));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const options = { remove: args.includes("--remove"), check: args.includes("--check") };
    const targets = args.filter(value => !value.startsWith("--"));
    if (
        targets.length !== 1 ||
        args.some(value => value.startsWith("--") && !["--remove", "--check"].includes(value))
    ) {
        console.error("Usage: node scripts/apply.mjs [--check] [--remove] /path/to/Equicord");
        process.exitCode = 2;
    } else {
        try {
            const changed = apply(targets[0], options);
            console.log(
                `${options.check ? "Would change" : "Changed"} ${changed.length} source file(s). No application files or settings were touched.`
            );
        } catch (error) {
            console.error(error.message);
            process.exitCode = 1;
        }
    }
}
