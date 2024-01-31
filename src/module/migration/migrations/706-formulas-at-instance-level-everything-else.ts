import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { Migration702REFormulasAtInstanceLevel } from "./702-re-formulas-at-instance-level.ts";

/** Change RE formula data replacement to operate at actor and item instance levels */
export class Migration706FormulasAtInstanceLevelEverythingElse extends Migration702REFormulasAtInstanceLevel {
    static override version = 0.706;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.system.description.value) {
            source.system.description.value = this.replaceInlineRolls(source.system.description.value);
        }

        if (source.type === "spell") {
            for (const value of Object.values(source.system.damage.value)) {
                value.value = this.raiseToInstanceLevel(value.value);
            }
        }

        if (source.type === "melee") {
            for (const value of Object.values(source.system.damageRolls)) {
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
