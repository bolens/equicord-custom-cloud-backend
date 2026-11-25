# Documentation

[README](README.md) owns compatibility, installation, client setup and removal.

| Topic                                   | Owner                                            |
| --------------------------------------- | ------------------------------------------------ |
| Plugin settings and lifecycle           | [index.tsx](index.tsx)                           |
| Supported Equicord source and integrity | [upstream.lock.json](upstream.lock.json)         |
| Core integration                        | [patches/equicord.patch](patches/equicord.patch) |
| Development and checks                  | [CONTRIBUTING.md](CONTRIBUTING.md)               |
| Trust boundaries and private data       | [SECURITY.md](SECURITY.md)                       |
| Release and recovery                    | [RELEASING.md](RELEASING.md)                     |
| Upstream attribution                    | [NOTICE](NOTICE) and [LICENSE](LICENSE)          |

## Architecture and state

The plugin adds an option to the exported Cloud tab options list while enabled and configured. Its URL is a normal Equicord plugin setting. Startup and shutdown register and unregister the option without choosing a server or changing authentication. Editing the selected custom server invalidates its authenticated flag.

The patch exports the existing options list, avoids assigning an official service icon to custom backends, adds local author metadata, and checks native `connect-src` permission before OAuth setup. Browser builds skip desktop permission APIs. OAuth secrets remain in Equicord's existing account and origin-scoped authorization store. This repository has no database or server state.

`npm test` verifies hashes and applies the patch to small pinned upstream source fixtures. The tests execute those real components and permission functions with stubbed Discord dependencies. `npm run integration` validates the same plugin against a full checkout and its native tools. Neither is a graphical client or an OAuth round trip.

## Source ownership

`index.tsx`, installer/build helpers, tests and docs are maintained here. `fixtures/upstream` contains exact upstream bytes from the locked revision. `patches/equicord.patch` describes intentional changes to that revision. Generated fixture trees, full upstream checkouts and build outputs belong in ignored `.cache/` or `dist/`.

A compatibility update must refresh the upstream revision, original fixture hashes, patched hashes and patch digest together, then pass the full integration gate. Update `NOTICE` when attribution changes. The upstream revision and Node version need deliberate review because the dependency bot does not update these custom lock fields.
