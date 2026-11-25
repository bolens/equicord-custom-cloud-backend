import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ROOT, sources } from "./upstream.mjs";

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
assert.match(pkg.version, /^0\.\d+\.\d+$/);
assert.equal(pkg.private, true);
assert.equal(pkg.license, "GPL-3.0-or-later");
assert.match(readFileSync(join(ROOT, "index.tsx"), "utf8"), /default: ""/);
assert.match(readFileSync(join(ROOT, ".node-version"), "utf8").trim(), /^24\.\d+\.\d+$/);
sources();
const markdown = readdirSync(ROOT).filter(path => path.endsWith(".md"));
for (const directory of [".github"]) {
    if (!existsSync(join(ROOT, directory))) continue;
    for (const file of readdirSync(join(ROOT, directory)))
        if (file.endsWith(".md")) markdown.push(join(directory, file));
}
for (const path of markdown) {
    const text = readFileSync(join(ROOT, path), "utf8").replace(/```[\s\S]*?```/g, "");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        const resolved = resolve(ROOT, dirname(path), target);
        assert(resolved.startsWith(ROOT + "/") && existsSync(resolved), `Broken local link in ${path}`);
    }
}
console.log("Version, empty default, source pins and local documentation links passed.");
