import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, git } from "./upstream.mjs";

if (git(ROOT, ["status", "--porcelain"])) throw new Error("Commit the reviewed release source before packaging.");
const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
if (!/^0\.\d+\.\d+$/.test(version)) throw new Error("Invalid release version.");
const name = `equicord-custom-cloud-backend-${version}`;
mkdirSync(join(ROOT, "dist"), { recursive: true });
const target = join(ROOT, "dist", name + ".tar.gz");
git(ROOT, ["archive", "--format=tar.gz", `--prefix=${name}/`, `--output=${target}`, "HEAD"]);
const digest = createHash("sha256").update(readFileSync(target)).digest("hex");
writeFileSync(target + ".sha256", `${digest}  ${name}.tar.gz\n`);
console.log(`Created dist/${name}.tar.gz and its SHA-256 receipt from ${git(ROOT, ["rev-parse", "HEAD"])}.`);
