import { CreatureConfig, CreatureConfigData } from "@actor/creature/config.ts";
import type { DocumentSheetV1Options } from "@client/appv1/api/document-sheet-v1.d.mts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { NPCPF2e } from "./document.ts";

export class NPCConfig extends CreatureConfig<NPCPF2e> {
    override async getData(options: Partial<DocumentSheetV1Options> = {}): Promise<NPCConfigData> {
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

        return {
            ...(await super.getData(options)),
            lootable: createSheetOptions(lootableOptions, { value: [lootableSelection] }),
        };
    }

    /** Remove stored properties if they're consistent with defaults; otherwise, store changes */
    override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const key = `flags.${SYSTEM_ID}.lootable`;
        const lootable = formData[key];

        if (lootable === "default") {
            delete formData[key];
            formData[`flags.${SYSTEM_ID}.-=lootable`] = null;
        } else {
            formData[key] = lootable === "lootable";
        }

        return super._updateObject(event, formData);
    }
}

interface NPCConfigData extends CreatureConfigData<NPCPF2e> {
    lootable: SheetOptions;
}
