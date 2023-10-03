import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Rename references to retired compendiums */
export class Migration836EnergizingConsolidation extends MigrationBase {
    static override version = 0.836;

    #rename(text: string): string {
        const newEffectEnergizingRune = "equipment-effects.R5ywXEYZFV1WBe8t";
        return text
            .replace("equipment-effects.ClsVhp5baFRjZQ23", newEffectEnergizingRune)
            .replace("equipment-effects.68xcDyxsNgD3JddD", newEffectEnergizingRune)
            .replace("equipment-effects.9BsFdrEc7hkPWgSd", newEffectEnergizingRune)
            .replace("equipment-effects.ascxqSlMEN9R6OOy", newEffectEnergizingRune)
            .replace("equipment-effects.4RnEUeYEzC919GZR", newEffectEnergizingRune);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.system.description.value.includes("equipment-effects")) {
            source.system.description.value = this.#rename(source.system.description.value);
        }
    }
}
