import type { UserPF2e } from "./document.ts";

/** Player-specific settings, stored as flags on each User */
class UserConfigPF2e extends fa.sheets.UserConfig<UserPF2e> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = { window: { contentTag: "div" } };

    static override PARTS = {
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        main: { template: `${SYSTEM_ROOT}/templates/user/sheet.hbs` },
        // Add a new main part, which embeds the original form part
        ...super.PARTS,
    };

    static override TABS: Record<string, fa.ApplicationTabsConfiguration> = {
        primary: {
            tabs: [
                { id: "core", icon: "fa-solid fa-user", label: "PACKAGECONFIG.Core" },
                { id: "pf2e", icon: "action-glyph", label: "PF2E.Pathfinder" },
            ],
            initial: "core",
        },
    };

    override async _prepareContext(options: fa.api.DocumentSheetRenderOptions): Promise<UserConfigRenderContextPF2e> {
        const context = await super._prepareContext(options);
        const createCharacterWidget = context.characterWidget;
        // Remove party actors from the selection
        const createAdjustedCharacterWidget = (...args: unknown[]): HTMLDivElement => {
            const widget = createCharacterWidget(...args);
            for (const option of widget.querySelectorAll("option")) {
                const actor = game.actors.get(option.value);
                if (actor?.isOfType("party")) {
                    option.remove();
                }
            }
            return widget;
        };

        return Object.assign(context, {
            tabs: context.tabs ?? this._prepareTabs("primary"),
            activeTab: this.tabGroups.primary,
            characterWidget: createAdjustedCharacterWidget,
        });
    }
}

interface UserConfigRenderContextPF2e extends fa.sheets.UserConfigRenderContext<UserPF2e> {
    tabs: Record<string, fa.ApplicationTab>;
    activeTab: string;
}

export { UserConfigPF2e };
