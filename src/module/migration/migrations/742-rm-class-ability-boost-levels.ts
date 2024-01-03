import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ClassSystemSource } from "@item/class/data.ts";
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

interface MaybeWithAbilityBoostLevels extends ClassSystemSource {
    abilityBoostLevels?: unknown;
    "-=abilityBoostLevels"?: null;
}
