import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.mjs";
import { ErrorPF2e } from "@util";
import type { UserSettingsPF2e } from "./data.ts";
import type { UserPF2e } from "./document.ts";

/** Player-specific settings, stored as flags on each User */
class UserConfigPF2e extends fa.sheets.UserConfig<UserPF2e> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = { window: { contentTag: "div" } };

    static override PARTS = {
        tabs: { template: "templates/generic/tab-navigation.hbs" },
        form: super.PARTS.form,
        pf2e: { template: `systems/${SYSTEM_ID}/templates/user/tab.hbs` },
        footer: super.PARTS.footer,
    };

    static override TABS: Record<string, fa.ApplicationTabsConfiguration> = {
        primary: {
            tabs: [
                { id: "form", icon: "fa-solid fa-user", label: "PACKAGECONFIG.Core" },
                { id: "pf2e", icon: "action-glyph", label: "PF2E.SystemNameShort" },
            ],
            initial: "form",
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
            systemId: SYSTEM_ID,
            settings: this.document.flags[SYSTEM_ID].settings,
        });
    }

    /** Turn the core template part into a tab. */
    protected override async _onRender(context: object, options: HandlebarsRenderOptions): Promise<void> {
        if (!options.parts.includes("form")) return super._onRender(context, options);
        const mainTab = this.element.querySelector<HTMLElement>("div[data-application-part=form]");
        if (!mainTab) throw ErrorPF2e("Unexpected missing main tab");
        mainTab.dataset.group = "primary";
        mainTab.dataset.tab = "form";
        mainTab.classList.add("tab");
        mainTab.classList.toggle("active", this.tabGroups.primary === "form");
        return super._onRender(context, options);
    }
}

interface UserConfigRenderContextPF2e extends fa.sheets.UserConfigRenderContext<UserPF2e> {
    tabs: Record<string, fa.ApplicationTab>;
    activeTab: string;
    systemId: SystemId;
    settings: UserSettingsPF2e;
}

export { UserConfigPF2e };
