import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ClassSource, ItemSourcePF2e } from "@item/data/index.ts";
import { SpellcastingEntrySystemData } from "@item/spellcasting-entry/data.ts";
import { sluggify } from "@util";
import { MigrationBase } from "../base.ts";

interface TraditionDataOld {
    value: SpellcastingEntrySystemData["tradition"]["value"] | "halcyon";
    halcyon?: boolean;
}

const defaultTraditionByClass: Record<string, keyof ConfigPF2e["PF2E"]["magicTraditions"]> = {
    wizard: "arcane",
    druid: "primal",
    ranger: "primal",
};

/** Halcyon is not a tradition, as it did nothing it was removed without replacement. */
export class Migration652KillHalcyonTradition extends MigrationBase {
    static override version = 0.652;

    override async updateItem(itemData: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (itemData.type !== "spellcastingEntry") return;

        const tradition: TraditionDataOld = itemData.system.tradition;
        if (tradition.value === "halcyon") {
            // Try to derive it from the class name. No other way to do it.
            // Users can always edit their tradition in the actual spellcasting entry.
            const classItem = actor?.items.find((testItem): testItem is ClassSource => testItem.type === "class");
            const className = classItem?.system.slug || sluggify(classItem?.name ?? "");
            tradition.value = defaultTraditionByClass[className] ?? "arcane";
        }
    }
}
