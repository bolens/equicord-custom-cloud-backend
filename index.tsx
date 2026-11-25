/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { cloudBackendOptions } from "@components/settings/tabs/sync/CloudTab";
import { Devs } from "@utils/constants";
import { useCspPermission } from "@utils/csp";
import { parseUrl } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

const customBackend = { label: "Custom Cloud", value: "" };
const connectDirectives = ["connect-src"];
let started = false;
const BACKEND_KEYS: "backendUrl"[] = ["backendUrl"];

const settings = definePluginSettings({
    backendUrl: {
        type: OptionType.STRING,
        description: "The HTTPS origin of your settings sync server. Select Custom Cloud in the Cloud tab to use it.",
        default: "",
        isValid(value) {
            if (typeof value !== "string") return "Enter an HTTPS origin.";
            if (value === "") return true;
            const url = parseUrl(value);
            return (
                (url?.protocol === "https:" &&
                    !url.username &&
                    !url.password &&
                    url.pathname === "/" &&
                    !url.search &&
                    !url.hash &&
                    value === value.trim()) ||
                "Enter an HTTPS origin without a path, credentials, query or fragment."
            );
        },
        onChange: updateBackend
    }
});

function updateBackend(value: string) {
    if (!started) return;

    const index = cloudBackendOptions.indexOf(customBackend);
    const selected = index !== -1 && Settings.cloud.url === customBackend.value;
    if (selected && Settings.cloud.url !== value) {
        Settings.cloud.authenticated = false;
        if (value) Settings.cloud.url = value;
    }

    if (!value) {
        if (index !== -1) cloudBackendOptions.splice(index, 1);
        return;
    }

    customBackend.value = parseUrl(Settings.cloud.url)?.href === parseUrl(value)?.href ? Settings.cloud.url : value;
    if (index === -1) cloudBackendOptions.push(customBackend);
}

function BackendPermissions() {
    const { backendUrl } = settings.use(BACKEND_KEYS);
    const [isAllowed, requestPermission] = useCspPermission(backendUrl, connectDirectives, "CustomCloudBackend");

    return (
        <>
            <Paragraph>
                Set your backend URL below, then select Custom Cloud in Equicord's Cloud tab and enable Cloud
                Integration.
            </Paragraph>
            {!!backendUrl && !isAllowed && (
                <Button onClick={requestPermission}>Allow connections to this backend</Button>
            )}
        </>
    );
}

export default definePlugin({
    name: "CustomCloudBackend",
    description: "Adds your own settings sync server to the Cloud Backend dropdown.",
    authors: [Devs.Bolens],
    enabledByDefault: true,
    settings,
    settingsAboutComponent: BackendPermissions,

    start() {
        started = true;
        updateBackend(settings.store.backendUrl);
    },

    stop() {
        started = false;
        const index = cloudBackendOptions.indexOf(customBackend);
        if (index !== -1) cloudBackendOptions.splice(index, 1);
    }
});
