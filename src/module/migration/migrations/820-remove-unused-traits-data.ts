import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Removed unused traits data structures from items that don't use them */
export class Migration820RemoveUnusedTraitsData extends MigrationBase {
    static override version = 0.82;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        const systemSource: MaybeWithTraits = source.system;
        if (!systemSource.traits) return;

        if ("custom" in systemSource.traits) {
            systemSource.traits["-=custom"] = null;
        }

        if (source.type === "spellcastingEntry" || source.type === "condition") {
            systemSource["-=traits"] = null;
        }
    }
}

interface MaybeWithTraits {
    traits?: { custom?: "string"; "-=custom"?: null; value?: string[] };
    "-=traits"?: null;
}
