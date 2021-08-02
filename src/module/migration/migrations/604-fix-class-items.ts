import { MigrationBase } from "../base";

export class Migration604FixClassItem extends MigrationBase {
    static override version = 0.604;

    override async updateItem(item: any) {
        if (item.type !== "class") return;

        if (Array.isArray(item.data.ancestryFeatLevels)) {
            item.data.ancestryFeatLevels = { value: item.data.ancestryFeatLevels };
        }

        if (Array.isArray(item.data.classFeatLevels)) {
            item.data.classFeatLevels = { value: item.data.classFeatLevels };
        }

        if (Array.isArray(item.data.skillFeatLevels)) {
            item.data.skillFeatLevels = { value: item.data.skillFeatLevels };
        }

        if (Array.isArray(item.data.generalFeatLevels)) {
            item.data.generalFeatLevels = { value: item.data.generalFeatLevels };
        }

        if (Array.isArray(item.data.skillIncreaseLevels)) {
            item.data.skillIncreaseLevels = { value: item.data.skillIncreaseLevels };
        }

        if (Array.isArray(item.data.abilityBoostLevels)) {
            item.data.abilityBoostLevels = { value: item.data.abilityBoostLevels };
        }
    }
}
