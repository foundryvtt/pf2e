import { ItemSourcePF2e } from "@item/data";
import { Migration702REFormulasAtInstanceLevel } from "./702-re-formulas-at-instance-level";

/** Change RE formula data replacement to operate at actor and item instance levels */
export class Migration706FormulasAtInstanceLevelEverythingElse extends Migration702REFormulasAtInstanceLevel {
    static override version = 0.706;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.data.description.value) {
            itemSource.data.description.value = this.replaceInlineRolls(itemSource.data.description.value);
        }

        if (itemSource.type === "spell") {
            for (const value of Object.values(itemSource.data.damage.value)) {
                value.value = this.raiseToInstanceLevel(value.value);
            }
        }

        if (itemSource.type === "melee") {
            for (const value of Object.values(itemSource.data.damageRolls)) {
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
