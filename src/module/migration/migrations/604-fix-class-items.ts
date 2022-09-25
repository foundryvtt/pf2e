import { ClassSource } from "@item/data";
import { MigrationBase } from "../base";

export class Migration604FixClassItem extends MigrationBase {
    static override version = 0.604;

    override async updateItem(item: MaybeWithAbilityBoosLevels) {
        if (item.type !== "class") return;

        if (Array.isArray(item.system.ancestryFeatLevels)) {
            item.system.ancestryFeatLevels = { value: item.system.ancestryFeatLevels };
        }

        if (Array.isArray(item.system.classFeatLevels)) {
            item.system.classFeatLevels = { value: item.system.classFeatLevels };
        }

        if (Array.isArray(item.system.skillFeatLevels)) {
            item.system.skillFeatLevels = { value: item.system.skillFeatLevels };
        }

        if (Array.isArray(item.system.generalFeatLevels)) {
            item.system.generalFeatLevels = { value: item.system.generalFeatLevels };
        }

        if (Array.isArray(item.system.skillIncreaseLevels)) {
            item.system.skillIncreaseLevels = { value: item.system.skillIncreaseLevels };
        }

        if (Array.isArray(item.system.abilityBoostLevels)) {
            item.system.abilityBoostLevels = { value: item.system.abilityBoostLevels };
        }
    }
}

type MaybeWithAbilityBoosLevels = ClassSource & {
    system: {
        abilityBoostLevels: unknown;
    };
};
