# Custom Cloud Backend for Equicord

Adds **Custom Cloud** to Equicord's Cloud Backend dropdown so selecting a self-hosted settings sync server keeps its URL. The backend URL starts empty. Set your own HTTPS origin in the plugin settings.

The plugin uses Equicord's existing Discord OAuth and sync flow. Its integration patch checks desktop host permission before requesting OAuth configuration, so a missing connection permission produces an approval prompt instead of a generic setup failure.

## Compatibility

This source package targets Equicord **1.15.18.2**, revision `8d63e9694b2ef5195806b3f8b2e03135a4b4ea2c`. [upstream.lock.json](upstream.lock.json) records the exact source hashes.

**The core integration patch is required.** Copying `index.tsx` alone or using a stock userplugin installer is insufficient. Equicord compiles user plugins into the client. This repo contains the plugin and its patch, rather than a fork or a prebuilt Discord client.

## Prepare an Equicord build

Use Node 24 LTS or a newer supported Node release, npm, and Git. The tested LTS version is in [.node-version](.node-version).

```sh
git clone https://github.com/bolens/equicord-custom-cloud-backend.git
cd equicord-custom-cloud-backend
npm ci --ignore-scripts
npm run check
npm run integration
```

The last command fetches the pinned public Equicord revision into `.cache/Equicord`, applies the source changes, installs its locked dependencies, and runs TypeScript, lint and the desktop build. It does not install or open Discord. The resulting desktop archive is `.cache/Equicord/dist/desktop.asar`.

To use an existing checkout at the supported revision:

```sh
npm run apply -- --check /path/to/Equicord
npm run apply -- /path/to/Equicord
```

This previews or applies only the known core files and plugin source. Unknown revisions and edited targets are refused. Repeating the command is safe. Build that checkout using its pinned pnpm version and `pnpm build --standalone --disable-updater`.

## Install and use

Follow Equicord's [custom build instructions](https://github.com/Equicord/Equicord#installing-equicord-devbuild). Back up your installed Equicord archive and fully quit Discord before replacing it. On an existing Linux desktop installation, the archive is normally `~/.config/Equicord/equicord.asar`. Other clients and operating systems have different installation paths. Do not copy a desktop archive into Equibop.

1. Reopen Discord and find **Equicord → Plugins → CustomCloudBackend**.
2. Enter your server's HTTPS origin, such as `https://sync.example.com`. No server is preset and no request is made while the setting is empty.
3. Open **Equicord → Cloud**, select **Custom Cloud**, and authorize with Discord.
4. If Equicord requests host permission, approve only your intended server and fully restart when prompted. Enable Cloud Integration again, then enable Settings Sync.

Changing an active custom URL clears the authenticated flag. Clearing it removes the custom dropdown entry. The plugin does not silently choose an official service, revoke saved origin-scoped tokens, or reset your sync preference.

The standalone build command disables Equicord's binary updater to preserve the local customization. Update the pinned source and rebuild when adopting an upstream update. Discord's own updater is separate.

## Remove or recover

With Discord closed, restore your backed-up official archive to return to the official Equicord build. This retains your settings and saved authorizations. Choose your intended backend explicitly afterward.

To remove this repo's unmodified source changes from a supported checkout:

```sh
npm run apply -- --remove --check /path/to/Equicord
npm run apply -- --remove /path/to/Equicord
```

Removal preserves edited plugin source rather than deleting it. Neither command removes accounts, sync records, client settings or saved credentials. If a write is interrupted, rerun the same command after checking the reported targets. Files already in the accepted original or patched state are recognized.

[Documentation](DOCUMENTATION.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [Releasing](RELEASING.md)
