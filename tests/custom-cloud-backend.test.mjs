/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

import { transformSync } from "esbuild";

function fixture(initialUrl = "https://cloud.equicord.org/", configuredUrl = "https://sync.example.com") {
    const Settings = { cloud: { url: initialUrl, authenticated: true, settingsSync: true } };
    const oauthOrigins = [];
    const React = {
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        Fragment: "Fragment"
    };
    const mocks = {
        "@api/Settings": {
            Settings,
            useSettings: () => Settings,
            definePluginSettings(def) {
                const store = Object.fromEntries(Object.entries(def).map(([key, option]) => [key, option.default]));
                return { def, store, use: () => store };
            }
        },
        "@api/SettingsSync/cloudSetup": {
            deauthorizeCloud: async () => {
                oauthOrigins.push(["deauthorize", Settings.cloud.url]);
            },
            authorizeCloud: async () => {
                oauthOrigins.push(["authorize", Settings.cloud.url]);
                Settings.cloud.authenticated = true;
            }
        },
        "@components/settings/tabs/BaseTab": { SettingsTab: "SettingsTab", wrapTab: component => component },
        "@utils/types": { default: plugin => plugin, OptionType: { STRING: 1 } },
        "@utils/constants": { Devs: { Bolens: { name: "bolens", id: 0n } } },
        "@utils/misc": {
            parseUrl: value => {
                try {
                    return new URL(value);
                } catch {
                    return null;
                }
            }
        },
        "@utils/localStorage": { localStorage: {} },
        "@utils/margins": { Margins: {} },
        "@utils/react": { useForceUpdater: () => () => {} },
        "@webpack": { findComponentByCodeLazy: () => "Icon" },
        "@webpack/common": {
            React,
            SearchableSelect: "SearchableSelect",
            Select: "Select",
            Alerts: {},
            useState: value => [value, () => {}]
        }
    };
    const modules = new Map();
    function load(id) {
        if (id in mocks) return { __esModule: true, ...mocks[id] };
        if (id === "@components/settings/tabs/sync/CloudTab")
            return compile("src/components/settings/tabs/sync/CloudTab.tsx");
        return new Proxy(
            { __esModule: true },
            { get: (target, key) => target[key] ?? (key === "Notice" ? { Info: "Info", Warning: "Warning" } : key) }
        );
    }
    function compile(path) {
        if (modules.has(path)) return modules.get(path);
        const { code } = transformSync(
            readFileSync(resolve(path.startsWith("src/") ? ".cache/upstream/" + path : path), "utf8"),
            {
                loader: "tsx",
                format: "cjs",
                jsx: "transform",
                jsxFactory: "React.createElement",
                jsxFragment: "React.Fragment"
            }
        );
        const module = { exports: {} };
        vm.runInNewContext(code, { module, exports: module.exports, require: load, React, URL }, { filename: path });
        modules.set(path, module.exports);
        return module.exports;
    }
    const { default: plugin } = compile("index.tsx");
    plugin.settings.store.backendUrl = configuredUrl;
    const tab = load("@components/settings/tabs/sync/CloudTab");
    function select() {
        function find(node) {
            if (!node || typeof node !== "object") return;
            if (node.type === "SearchableSelect") return node.props;
            for (const child of node.props?.children.flat(Infinity) ?? []) {
                const result = find(child);
                if (result) return result;
            }
        }
        return find(tab.default());
    }
    return { plugin, tab, Settings, oauthOrigins, select };
}

test("Custom Cloud is selected and stays selected through the real Cloud tab callback", async () => {
    const f = fixture();
    f.plugin.start();
    assert.equal(f.select().options.length, 3);
    const custom = f.select().options.find(option => option.label === "Custom Cloud");
    await f.select().onChange(custom.value);
    assert.equal(f.Settings.cloud.url, "https://sync.example.com");
    assert.equal(f.select().value, custom.value);
    assert.equal(f.Settings.cloud.authenticated, true);
    assert.deepEqual(f.oauthOrigins.at(-1), ["authorize", custom.value]);
    assert.equal(f.select().renderOptionPrefix(custom), null);
    await f.select().onChange("https://api.vencord.dev/");
    assert.equal(f.Settings.cloud.url, "https://api.vencord.dev/");
    await f.select().onChange(custom.value);
    assert.equal(f.select().value, custom.value);
});

test("Starting, disabling and restarting preserve the active server and authentication", () => {
    const f = fixture("https://sync.example.com/");
    f.plugin.start();
    assert.equal(f.select().value, f.Settings.cloud.url);
    assert.equal(f.Settings.cloud.authenticated, true);
    f.plugin.stop();
    assert.equal(f.select().options.length, 2);
    assert.equal(f.Settings.cloud.url, "https://sync.example.com/");
    f.plugin.start();
    assert.equal(f.select().options.length, 3);
    assert.equal(f.select().value, f.Settings.cloud.url);
    assert.equal(f.oauthOrigins.length, 0);
});

test("Editing an active custom backend requires new authorization and preserves sync preference", () => {
    const f = fixture("https://sync.example.com");
    f.plugin.start();
    f.plugin.settings.store.backendUrl = "https://other.example.com";
    f.plugin.settings.def.backendUrl.onChange("https://other.example.com");
    assert.equal(f.select().value, "https://other.example.com");
    assert.equal(f.Settings.cloud.authenticated, false);
    assert.equal(f.Settings.cloud.settingsSync, true);
});

test("Editing or disabling an inactive option does not switch the user's server", () => {
    const f = fixture();
    f.plugin.start();
    f.plugin.settings.def.backendUrl.onChange("https://sync.example.com");
    assert.equal(f.Settings.cloud.url, "https://cloud.equicord.org/");
    assert.equal(f.Settings.cloud.authenticated, true);
    f.plugin.stop();
    f.plugin.settings.def.backendUrl.onChange("https://other.example.com");
    assert.equal(f.select().options.length, 2);
});

test("Only HTTPS origins without embedded credentials are accepted", () => {
    const valid = fixture().plugin.settings.def.backendUrl.isValid;
    for (const value of ["https://sync.example.com", "https://sync.example.com/", "https://sync.example.com:8443"])
        assert.equal(valid(value), true);
    for (const value of [
        undefined,
        "bad",
        "http://sync.example.com",
        "https://user:pass@sync.example.com",
        "https://sync.example.com/path",
        "https://sync.example.com?x=y",
        "https://sync.example.com#token",
        " https://sync.example.com"
    ])
        assert.equal(typeof valid(value), "string");
});

test("A fresh plugin has no preset server and registers nothing until configured", () => {
    const f = fixture(undefined, "");
    assert.equal(f.plugin.settings.def.backendUrl.default, "");
    f.plugin.start();
    assert.equal(f.select().options.length, 2);
    assert.equal(f.Settings.cloud.url, "https://cloud.equicord.org/");
    f.plugin.settings.store.backendUrl = "https://sync.example.com";
    f.plugin.settings.def.backendUrl.onChange("https://sync.example.com");
    assert.equal(f.select().options.length, 3);
    f.plugin.settings.def.backendUrl.onChange("");
    assert.equal(f.select().options.length, 2);
    assert.equal(f.plugin.settings.def.backendUrl.isValid(""), true);
});
