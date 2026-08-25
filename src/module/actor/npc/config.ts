import { CreatureConfig, CreatureConfigContext } from "@actor/creature/config.ts";
import type { SettingsMenuOptions } from "@module/system/settings/menu.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { createHTMLElement } from "@util";
import { NPCPF2e } from "./document.ts";

export class NPCConfig extends CreatureConfig<NPCPF2e> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration> = {
        actions: { openAutomationSettings: NPCConfig.#onClickOpenAutomationSettings },
    };

    static override PARTS = NPCConfig.configParts(`systems/${SYSTEM_ID}/templates/actors/npc/config.hbs`);

    protected override async _prepareContext(options: fa.api.DocumentSheetRenderOptions): Promise<NPCConfigContext> {
        const lootableDefault = game.settings.get(SYSTEM_ID, "automation.lootableNPCs");
        const lootableOptions = {
            default: `PF2E.Actor.NPC.Configure.Lootable.${lootableDefault ? "DefaultLootable" : "DefaultNotLootable"}`,
            lootable: "PF2E.Actor.NPC.Configure.Lootable.Lootable",
            notLootable: "PF2E.Actor.NPC.Configure.Lootable.NotLootable",
        };
        const lootableSelection = (() => {
            const storedSelection = this.actor._source.flags[SYSTEM_ID]?.lootable;
            return typeof storedSelection === "boolean" ? (storedSelection ? "lootable" : "notLootable") : "default";
        })();

        const settingsLink = createHTMLElement("button", {
            classes: ["inline-link"],
            dataset: { action: "openAutomationSettings" },
            children: [_loc("PF2E.Actor.NPC.Configure.Lootable.AutomationSettings")],
        });
        settingsLink.type = "button";
        settingsLink.disabled = !game.user.isGM;

        return {
            ...(await super._prepareContext(options)),
            lootable: createSheetOptions(lootableOptions, { value: [lootableSelection] }),
            lootableHint: _loc("PF2E.Actor.NPC.Configure.Lootable.Hint", { settings: settingsLink.outerHTML }),
        };
    }

    /** Remove the stored property if it's consistent with the default; otherwise, store the change */
    protected override _processFormData(
        event: SubmitEvent | null,
        form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ): Record<string, unknown> {
        const data = super._processFormData(event, form, formData);
        const path = `flags.${SYSTEM_ID}.lootable`;
        const lootable = fu.getProperty(data, path);
        fu.setProperty(data, path, lootable === "default" ? _del : lootable === "lootable");

        return data;
    }

    static async #onClickOpenAutomationSettings(this: NPCConfig): Promise<void> {
        const menu = game.settings.menus.get(`${SYSTEM_ID}.automation`);
        if (menu) {
            const options: Partial<SettingsMenuOptions> = { highlightSetting: "lootableNPCs" };
            new menu.type(undefined, options).render(true);
        }
    }
}

interface NPCConfigContext extends CreatureConfigContext<NPCPF2e> {
    lootable: SheetOptions;
    lootableHint: string;
}
