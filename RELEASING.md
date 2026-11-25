# Releasing

[Documentation](DOCUMENTATION.md)

This project prepares versioned GPL source archives. `package.json` is the authoritative SemVer version. No workflow publishes a client, changes a workstation, or releases automatically.

## Validate and review

Run `npm ci --ignore-scripts`, `make validate`, and `npm run integration`. Review the complete diff, fixture provenance, patch hashes, default URL, dependency lock and changelog. Commit only reviewed source with a Conventional Commit subject.

Follow the [fleet delivery policy](https://github.com/bolens/.github/blob/cbe2f2d4e393819c9041853aee2b055807fec90d/RELEASING.md): fetch GitHub's default branch, work on a feature branch, push only that branch, open a PR, require all current-head checks and resolved conversations, and squash merge without bypass. Verify the merged SHA and its checks before any release. Never force-push or push `main` during ordinary delivery.

CI's `Gate` requires both platform source jobs, the full Equicord integration, shared workflow syntax/security checks and shared Source lint. Configure it as required only after its first successful hosted run. Proposed rules also restrict merges to squash and require resolved conversations. These are setup requirements, not claims that an uncreated GitHub repository is protected.

## First repository setup

The local preparation branch is `codex/initial-plugin`. Creating or publishing the GitHub repository is a separate requested action. Establish the GitHub `main` baseline, rebase the preparation branch onto it while preserving the reviewed files, then use the normal PR path. Confirm `origin` targets `bolens/equicord-custom-cloud-backend`. Enable the reviewed workflow/ruleset settings after observing actual hosted checks. Do not use the bootstrap to bypass an existing protected branch.

## Package and publish

After a release PR updates the version and moves Unreleased notes into a dated changelog section, merge it and verify exact merged-main CI. From a clean checkout at that merged commit:

```sh
npm run package
```

This creates `dist/equicord-custom-cloud-backend-VERSION.tar.gz` and a SHA-256 file from committed source. Inspect the archive, verify its checksum and rerun its source gate after extraction. It includes the plugin, patch, fixture provenance, tests, lockfile, license and installer helpers. It excludes CI and local hook metadata. It contains no compiled Equicord client or runtime configuration.

When publication is requested, the maintainer creates a signed annotated `vVERSION` tag matching `package.json`, pushes that exact tag and attaches the inspected source archive and checksum to a GitHub release. The initial `0.1.0` source has not been tagged or released by preparation. Verify the public tag SHA, release files and checksum after publication. Record release evidence privately rather than adding local paths or task logs to the repo.

## Recover

Before publication, fix the feature branch and rerun its gates. After merge, use a corrective or revert PR. Never move a public tag or overwrite an existing release artifact. Ship a new version for a public defect.

Source removal and application rollback are documented in [README.md](README.md). Preserve client data and the operator's original archive. Repository delivery does not authorize installing a build, restarting Discord, changing backend permissions or deleting synced data.
