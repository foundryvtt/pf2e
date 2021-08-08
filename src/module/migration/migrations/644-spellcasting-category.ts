import { ActorSourcePF2e } from "@actor/data";
import { ClassSource, ItemSourcePF2e } from "@item/data";
import { SpellcastingEntrySource, SpellcastingEntrySystemData } from "@item/spellcasting-entry/data";
import { MigrationBase } from "../base";

const oldTraditions = ["arcane", "occult", "primal", "divine", "focus", "ritual", "halcyon", ""] as const;

const defaultTraditionByClass: Record<string, keyof ConfigPF2e["PF2E"]["magicTraditions"]> = {
    Wizard: "arcane",
    Cleric: "divine",
    Druid: "primal",
    Bard: "occult",
    Ranger: "primal",
    Champion: "divine",
    Monk: "divine",
};

export class Migration644SpellcastingCategory extends MigrationBase {
    static override version = 0.644;

    override async updateItem(item: ItemSourcePF2e, actor?: ActorSourcePF2e) {
        if (!actor || item.type !== "spellcastingEntry") return;
        interface SpellcastingOld extends Omit<SpellcastingEntrySystemData, "tradition"> {
            tradition: {
                value: typeof oldTraditions[number];
            };
        }

        const spellcasting: SpellcastingOld = item.data;
        if (spellcasting.tradition.value === "ritual") {
            spellcasting.prepared.value = "ritual";
            spellcasting.tradition.value = "";
        } else if (spellcasting.tradition.value === "focus") {
            spellcasting.prepared.value = "focus";

            // Try to see if there's a matching spellcasting entry that is similar to this one
            const possibleMatch = actor.items.find((testItem): testItem is SpellcastingEntrySource => {
                if (testItem.type !== "spellcastingEntry") return false;
                const testSpellcasting: SpellcastingOld = testItem.data;
                return (
                    testSpellcasting.tradition.value !== "focus" &&
                    testSpellcasting.spelldc.value === spellcasting.spelldc.value &&
                    testSpellcasting.proficiency.value === spellcasting.proficiency.value &&
                    testSpellcasting.ability.value === spellcasting.ability.value
                );
            });

            if (possibleMatch) {
                spellcasting.tradition.value = possibleMatch.data.tradition.value;
            } else {
                // Try to derive it from the class name,
                const className = actor.items.find(
                    (testItem): testItem is ClassSource => testItem.type === "class"
                )?.name;
                spellcasting.tradition.value = defaultTraditionByClass[className ?? ""] ?? "arcane";
            }
        }
    }
}
