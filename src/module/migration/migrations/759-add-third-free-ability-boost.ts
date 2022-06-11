import { AbilityString } from "@actor/data/base";
import { ItemSourcePF2e } from "@item/data";
import { sluggify } from "@util";
import { MigrationBase } from "../base";

/** Add third free ability boost to Amnesiac and Discarded Duplicate backgrounds */
export class Migration759AddThirdFreeAbilityBoost extends MigrationBase {
    static override version = 0.759;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== "background") return;

        const slug = itemSource.data.slug ?? sluggify(itemSource.name);

        if (!(slug === "amnesiac" || slug == "discarded-duplicate")) return;

        if (Object.keys(itemSource.data.boosts).length < 3) {
            itemSource.data.boosts = {
                "0": {
                    "value": freeAbilityBoost()
                },
                "1": {
                    "value": freeAbilityBoost()
                },
                "2": {
                    "value": freeAbilityBoost()
                }
            }
        }
    }
}

function freeAbilityBoost(): AbilityString[] {
    return [
        "cha",
        "con",
        "dex",
        "int",
        "str",
        "wis",
    ];
}