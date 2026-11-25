/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { transformSync } from "esbuild";

function fixture({ allowed = false, result = "ok", web = false, saved = false } = {}) {
    const Settings = { cloud: { url: "https://sync.example.com", authenticated: true } };
    const requests = [];
    const restarts = [];
    const notifications = [];
    const fetches = [];
    const modals = [];
    const mocks = {
        "@api/Settings": { Settings },
        "@api/DataStore": { get: async () => (saved ? { "https://sync.example.com:123": "fixture" } : {}) },
        "@api/Notifications": { showNotification: value => notifications.push(value) },
        "@utils/Logger": { Logger: class {} },
        "@utils/promptToRestart": { promptToRestart: (...args) => restarts.push(args) },
        "@webpack/common": {
            UserStore: { getCurrentUser: () => ({ id: "123" }) },
            openModal: modal => modals.push(modal),
            OAuth2AuthorizeModal: "OAuth2AuthorizeModal"
        }
    };
    const { code } = transformSync(readFileSync(".cache/upstream/src/api/SettingsSync/cloudSetup.tsx", "utf8"), {
        loader: "tsx",
        format: "cjs",
        jsx: "transform",
        jsxFactory: "React.createElement"
    });
    const module = { exports: {} };
    vm.runInNewContext(code, {
        module,
        exports: module.exports,
        URL,
        IS_WEB: web,
        require: id => ({ __esModule: true, ...mocks[id] }),
        VencordNative: {
            csp: {
                isDomainAllowed: async () => allowed,
                requestAddOverride: async (...args) => {
                    requests.push(args);
                    return result;
                }
            }
        },
        fetch: async url => {
            fetches.push(url.href);
            return {
                json: async () => ({
                    clientId: "fixture-client",
                    redirectUri: "https://sync.example.com/v1/oauth/callback"
                })
            };
        }
    });
    return { Settings, requests, restarts, notifications, fetches, modals, authorize: module.exports.authorizeCloud };
}

test("Missing CSP permission prompts for only the backend origin before any fetch", async () => {
    const f = fixture();
    await f.authorize();
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0][0], "https://sync.example.com");
    assert.deepEqual(Array.from(f.requests[0][1]), ["connect-src"]);
    assert.equal(f.restarts[0][0], "relaunch");
    assert.equal(f.Settings.cloud.authenticated, false);
    assert.equal(f.fetches.length, 0);
    assert.equal(f.notifications.length, 0);
});

test("Cancellation leaves authentication disabled without fetching or restarting", async () => {
    const f = fixture({ result: "cancelled" });
    await f.authorize();
    assert.equal(f.Settings.cloud.authenticated, false);
    assert.equal(f.fetches.length, 0);
    assert.equal(f.restarts.length, 0);
    assert.equal(f.notifications.length, 0);
});

test("Unchecked permission explains the host requirement", async () => {
    const f = fixture({ result: "unchecked" });
    await f.authorize();
    assert.match(f.notifications[0].body, /host permission/);
    assert.equal(f.fetches.length, 0);
});

test("Saved tokens cannot bypass the CSP permission check", async () => {
    const f = fixture({ saved: true });
    await f.authorize();
    assert.equal(f.Settings.cloud.authenticated, false);
    assert.equal(f.requests.length, 1);
});

test("An allowed backend retrieves OAuth metadata and opens Discord authorization", async () => {
    const f = fixture({ allowed: true });
    await f.authorize();
    assert.deepEqual(f.fetches, ["https://sync.example.com/v1/oauth/settings"]);
    assert.equal(f.modals.length, 1);
    assert.equal(f.requests.length, 0);
});

test("The web build does not call desktop permission APIs", async () => {
    const f = fixture({ web: true });
    await f.authorize();
    assert.equal(f.fetches.length, 1);
    assert.equal(f.requests.length, 0);
});

test("The native CSP handler includes a configured backend only in connect-src", () => {
    let handler;
    const nativeSettings = {
        store: {
            migratedThemeLinkCsp: true,
            customCspRules: { "sync.example.com": ["connect-src"] }
        }
    };
    const session = {
        defaultSession: {
            webRequest: {
                onHeadersReceived: callback => {
                    handler = callback;
                }
            }
        }
    };
    const { code } = transformSync(readFileSync(".cache/upstream/src/main/csp/index.ts", "utf8"), {
        loader: "ts",
        format: "cjs"
    });
    const module = { exports: {} };
    vm.runInNewContext(code, {
        module,
        exports: module.exports,
        URL,
        DESKTOP_MONACO_EDITOR_URL: "https://editor.example.com",
        require: id => ({ __esModule: true, ...(id === "electron" ? { session } : { NativeSettings: nativeSettings }) })
    });
    module.exports.initCsp();
    const headers = {
        "content-security-policy": ["default-src 'self'; connect-src 'self'; script-src 'self'; img-src 'self'"]
    };
    handler(
        { responseHeaders: headers, resourceType: "mainFrame", url: "https://discord.com/channels/@me" },
        result => {
            const directives = result.responseHeaders["content-security-policy"][0].split("; ");
            assert.match(
                directives.find(d => d.startsWith("connect-src ")),
                /sync\.example\.com/
            );
            assert.doesNotMatch(
                directives.find(d => d.startsWith("script-src ")),
                /sync\.example\.com/
            );
            assert.doesNotMatch(
                directives.find(d => d.startsWith("img-src ")),
                /sync\.example\.com/
            );
        }
    );
});
