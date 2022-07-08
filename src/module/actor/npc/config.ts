import { CreatureConfig, CreatureConfigData } from "@actor/creature/config";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers";
import { NPCPF2e } from ".";

export class NPCConfig extends CreatureConfig<NPCPF2e> {
    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<NPCConfigData> {
        const lootableDefault = game.settings.get("pf2e", "automation.lootableNPCs");
        const lootableOptions = {
            default: `PF2E.Actor.NPC.Configure.Lootable.${lootableDefault ? "DefaultLootable" : "DefaultNotLootable"}`,
            lootable: "PF2E.Actor.NPC.Configure.Lootable.Lootable",
            notLootable: "PF2E.Actor.NPC.Configure.Lootable.NotLootable",
        };
        const lootableSelection = (() => {
            const storedSelection = this.actor.data._source.flags.pf2e?.lootable;
            return typeof storedSelection === "boolean" ? (storedSelection ? "lootable" : "notLootable") : "default";
        })();

        return {
            ...(await super.getData(options)),
            lootable: createSheetOptions(lootableOptions, { value: [lootableSelection] }),
        };
    }

    /** Remove stored properties if they're consistent with defaults; otherwise, store changes */
    override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const lootable = formData["flags.pf2e.lootable"];

        if (lootable === "default") {
            delete formData["flags.pf2e.lootable"];
            formData["flags.pf2e.-=lootable"] = null;
        }

        return super._updateObject(event, formData);
    }
}

interface NPCConfigData extends CreatureConfigData<NPCPF2e> {
    lootable: SheetOptions;
}
