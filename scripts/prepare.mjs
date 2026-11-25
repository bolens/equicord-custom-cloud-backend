import { lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, sources } from "./upstream.mjs";

const output = join(ROOT, ".cache/upstream");
for (const path of [join(ROOT, ".cache"), output]) {
    try {
        if (lstatSync(path).isSymbolicLink()) throw new Error("Fixture directories must not be symlinks.");
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
}
for (const [path, data] of sources().patched) {
    const target = join(output, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
}
console.log("Prepared hash-verified patched upstream fixtures without network access.");
