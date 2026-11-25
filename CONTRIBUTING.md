# Contributing

[Documentation](DOCUMENTATION.md)

Use the Node version in `.node-version`, Git, and npm. The package manager and dependencies are pinned in `package.json` and `package-lock.json`.

```sh
npm ci --ignore-scripts
npm run hooks:install
make validate
npm run integration
```

`make validate` requires actionlint, Zizmor and Gitleaks on PATH. It runs the same local source gate used by CI, workflow syntax/security checks, and a redacted secret scan. The integration command needs network access for the pinned public checkout and locked packages. Neither gate contacts a private backend, starts containers or launches Discord.

The pre-commit hook checks a disposable snapshot of the staged index. It uses installed dependencies, never downloads tools, and does not rewrite your files or index. Its source tests finish in under a second on the initial Linux checkout. The pre-push hook runs `make validate`. Both require Gitleaks. Expensive full Equicord builds remain in CI or an explicit `npm run integration` run.

Use Conventional Commit subjects such as `fix: preserve custom backend selection`. Keep source, patch, compatibility metadata, tests and affected documentation together. Add changelog entries for user-visible behavior or compatibility changes. Record AI assistance in an `Assisted-by` trailer and review all assisted changes before submission.

Follow the feature branch and squash merge process in [RELEASING.md](RELEASING.md). Do not submit this private-use customization upstream on someone else's behalf.

## Test coverage

The local suite covers dropdown selection, the empty default, authentication invalidation, permission approval/cancellation, actual CSP header generation, and apply/remove preservation and refusal cases. Fixtures are hash-verified before use. `npm run format:check` checks maintained formatting, while upstream fixtures and the patch retain their exact source bytes.

The full integration gate runs Equicord's TypeScript checker, lint for all touched application sources, and its desktop build at the exact locked revision. GitHub runs the source gate on Linux and macOS and integration on Linux. These workflows are prepared here; hosted results and branch protection must be verified after repository creation.
