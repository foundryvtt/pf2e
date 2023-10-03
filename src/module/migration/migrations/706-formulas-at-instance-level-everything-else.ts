import { ItemSourcePF2e } from "@item/data/index.ts";
import { Migration702REFormulasAtInstanceLevel } from "./702-re-formulas-at-instance-level.ts";

/** Change RE formula data replacement to operate at actor and item instance levels */
export class Migration706FormulasAtInstanceLevelEverythingElse extends Migration702REFormulasAtInstanceLevel {
    static override version = 0.706;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.system.description.value) {
            itemSource.system.description.value = this.replaceInlineRolls(itemSource.system.description.value);
        }

        if (itemSource.type === "spell") {
            for (const value of Object.values(itemSource.system.damage.value)) {
                value.value = this.raiseToInstanceLevel(value.value);
            }
        }

        if (itemSource.type === "melee") {
            for (const value of Object.values(itemSource.system.damageRolls)) {
                value.damage = this.raiseToInstanceLevel(value.damage);
            }
        }
    }

    private replaceInlineRolls(value: string) {
        return value.replace(/\[\[(.*)\]\]/g, (match) => {
            return this.raiseToInstanceLevel(match);
        });
    }
}
