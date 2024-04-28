import { htmlQueryAll } from "@util";
import type { UserPF2e } from "./document.ts";

/** Player-specific settings, stored as flags on each User */
export class UserConfigPF2e<TUser extends UserPF2e> extends foundry.applications.sheets.UserConfig<TUser> {
    static override PARTS = {
        tabs: {
            template: "templates/generic/tab-navigation.hbs",
        },
        // Add a new main part, which embeds the original form part
        main: {
            template: "systems/pf2e/templates/user/sheet.hbs",
        },

        ...fu.deepClone(super.PARTS),
    };

    override tabGroups = {
        primary: "core",
    };

    #getTabs() {
        const DEFAULTS = { group: "primary" as const, active: false, cssClass: "" };
        const tabs = [
            { ...DEFAULTS, id: "core", icon: "fa-solid fa-user", label: "Core" },
            { ...DEFAULTS, id: "pf2e", icon: "fa-solid fa-dice", label: "System" },
        ];
        for (const tab of tabs) {
            tab.active = this.tabGroups[tab.group] === tab.id;
            tab.cssClass = tab.active ? "active" : "";
        }
        return tabs;
    }

    override async _prepareContext(options: DocumentSheetRenderOptions): Promise<UserConfigDataPF2e<TUser>> {
        const data = await super._prepareContext(options);

        // Remove party actors from the selection
        function createAdjustedCharacterWidget(...args: unknown[]) {
            const widget = data.characterWidget(...args);
            for (const option of htmlQueryAll(widget, "option")) {
                const actor = game.actors.get(option.value);
                if (actor?.isOfType("party")) {
                    option.remove();
                }
            }
            return widget;
        }

        return {
            ...data,
            tabGroups: this.tabGroups,
            tabs: this.#getTabs(),
            characterWidget: createAdjustedCharacterWidget,
        };
    }
}

interface UserConfigDataPF2e<TUser extends UserPF2e> extends UserConfigData<TUser> {
    tabs: Partial<ApplicationTab>[];
    tabGroups: Record<string, string>;
}
