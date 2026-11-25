# Security

[Documentation](DOCUMENTATION.md)

The configured backend receives cloud authorization and synchronized settings through Equicord's existing APIs. Use a server you control or trust. Only HTTPS origins without embedded credentials, paths, queries or fragments are accepted. No hostname, credential or account is preset in this repository.

Desktop authorization requests only `connect-src` for the chosen origin using Equicord's native host-permission mechanism. The patch does not allow arbitrary hosts or grant script, image or filesystem access. A full restart is required for a newly approved CSP rule to take effect.

The apply helper accepts only the locked Equicord revision and known original or patched target hashes. It refuses changed source, staged target changes and symlinked target paths before mutation. It writes source files, not installed applications or settings. Filesystem errors or concurrent edits can interrupt a multi-file operation. Review diagnostics and rerun only when targets remain in an accepted state. Never force replacement of an edited target.

Do not include real backend URLs, client settings, auth data, private logs or compiled client archives in issues, fixtures or commits. Use reserved example domains and redact diagnostics. Secrets remain in the application's native state, outside this repo.

Report vulnerabilities privately through GitHub's security advisory flow for this repository once it is published. Do not post credentials or private endpoint details in a public issue. This project is an independent customization and is not an official Equicord release.
