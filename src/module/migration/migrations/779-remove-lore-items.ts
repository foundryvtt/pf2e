import { ActorSourcePF2e } from "@actor/data";
import { isObject, sluggify } from "@util";
import { LoreSource } from "@item/data";
import { MigrationBase } from "../base";
import { ZeroToFour } from "@module/data";
import { AbilityString } from "@actor/types";

/** Rename references to retired compendiums */
export class Migration779RemoveLoreItems extends MigrationBase {
    static override version = 0.779;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        if (!isObject(source.system.lores)) {
            source.system.lores = {};
        }

        const lores = source.items.filter((item): item is LoreSource => item.type === "lore");
        for (const lore of lores) {
            const loreData: CharacterLoreData = {
                name: lore.name,
                rank: lore.system.proficient.value,
                ability: "int",
            };
            const key = sluggify(lore.name);
            source.system.lores[key] = loreData;

            const index = source.items.findIndex((item) => item === lore);
            if (index > -1) source.items.splice(index, 1);
        }
    }
}

interface CharacterLoreData {
    name: string;
    rank: ZeroToFour;
    ability: AbilityString;
}
