import { ClassSystemData } from "@item/class/data.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Remove ability boost levels data from class items */
export class Migration742RMAbilityBoostLevels extends MigrationBase {
    static override version = 0.742;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "class") return;

        const systemData: MaybeWithAbilityBoostLevels = source.system;
        if ("abilityBoostLevels" in source.system) {
            delete systemData.abilityBoostLevels;
            systemData["-=abilityBoostLevels"] = null;
        }
    }
}

interface MaybeWithAbilityBoostLevels extends ClassSystemData {
    abilityBoostLevels?: unknown;
    "-=abilityBoostLevels"?: null;
}
