import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { apply } from "../scripts/apply.mjs";
import { git, lock, pluginPath, sources } from "../scripts/upstream.mjs";

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "cloud-apply-test-"));
    const prior = lock.revision;
    t.after(() => {
        lock.revision = prior;
        rmSync(root, { recursive: true, force: true });
    });
    const original = sources().originals;
    for (const [path, data] of original) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), data);
    }
    git(root, ["init", "--quiet"]);
    git(root, ["config", "user.name", "Fixture"]);
    git(root, ["config", "user.email", "fixture@example.com"]);
    git(root, ["add", "src"]);
    git(root, ["-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "test: fixture"]);
    lock.revision = git(root, ["rev-parse", "HEAD"]);
    return { root, original };
}

test("Apply and removal are idempotent and preserve unrelated files", t => {
    const { root, original } = fixture(t);
    writeFileSync(join(root, "unrelated.txt"), "preserve");
    assert.equal(apply(root, { check: true }).length, 4);
    assert.equal(git(root, ["status", "--porcelain", "--", "src"]), "");
    assert.equal(apply(root).length, 4);
    assert.equal(apply(root).length, 0);
    assert.equal(apply(root, { remove: true }).length, 4);
    assert.equal(apply(root, { remove: true }).length, 0);
    for (const [path, data] of original) assert.deepEqual(readFileSync(join(root, path)), data);
    assert.equal(readFileSync(join(root, "unrelated.txt"), "utf8"), "preserve");
});

test("Conflicts are found before any target file changes", t => {
    const { root, original } = fixture(t);
    mkdirSync(dirname(join(root, pluginPath)), { recursive: true });
    writeFileSync(join(root, pluginPath), "operator source");
    assert.throws(() => apply(root), /Edited target preserved/);
    for (const [path, data] of original) assert.deepEqual(readFileSync(join(root, path)), data);
});

test("Edited installed plugins are retained during removal", t => {
    const { root } = fixture(t);
    apply(root);
    writeFileSync(join(root, pluginPath), "operator source");
    const before = git(root, ["diff"]);
    assert.throws(() => apply(root, { remove: true }), /Edited target preserved/);
    assert.equal(git(root, ["diff"]), before);
});

test("Wrong upstream revisions and staged target edits are refused", t => {
    const { root } = fixture(t);
    git(root, ["-c", "commit.gpgsign=false", "commit", "--quiet", "--allow-empty", "-m", "test: later revision"]);
    assert.throws(() => apply(root), /Unsupported Equicord revision/);
    lock.revision = git(root, ["rev-parse", "HEAD"]);
    writeFileSync(join(root, "src/utils/constants.ts"), "operator source");
    git(root, ["add", "src/utils/constants.ts"]);
    assert.throws(() => apply(root), /staged changes/);
});

test("Symlinked plugin parents cannot redirect writes outside the checkout", t => {
    const { root } = fixture(t);
    const elsewhere = join(root, "elsewhere");
    mkdirSync(elsewhere);
    symlinkSync(elsewhere, join(root, "src/userplugins"), "dir");
    assert.throws(() => apply(root), /Refusing symlink/);
    assert.equal(git(root, ["diff"]), "");
});
