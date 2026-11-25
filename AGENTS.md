# Agent guidance

Read [DOCUMENTATION.md](DOCUMENTATION.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before changing behavior. Use [RELEASING.md](RELEASING.md) for delivery.

- Keep the public backend URL default empty. Use reserved example domains in tests and docs. Never copy client settings, authorizations, credentials, logs or installed archives into this repo.
- The plugin and pinned Equicord patch form one integration. Update `upstream.lock.json`, upstream fixtures, patch and acceptance tests together when changing compatibility.
- Do not hand-edit imported fixtures. Copy exact bytes from the recorded upstream Git revision and preserve its license notices.
- Application code changes must pass `npm run integration`. Tests and setup may create disposable source checkouts but must never install, launch or modify a real Discord client.
- The apply helper must preserve unrelated edits and refuse unknown revisions, modified targets, staged target changes and symlinked paths.
- Run `make validate` before delivery. Keep commits scoped and use Conventional Commits. Disclose assisted work with an `Assisted-by` commit trailer.
- Keep temporary source checkouts and evidence in ignored `.cache/`. Do not publish a repository, push, tag, release or change GitHub settings unless requested.
