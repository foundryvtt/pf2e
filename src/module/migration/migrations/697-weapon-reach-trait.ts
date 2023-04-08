import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Correct the reach trait on weapons */
export class Migration697WeaponReachTrait extends MigrationBase {
    static override version = 0.697;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type === "weapon") {
            const traits = itemSource.system.traits.value;
            const numericReach = traits.find((t) => /^reach-\d+$/.test(t));
            if (numericReach) {
                traits.splice(traits.indexOf(numericReach), 1, "reach");
            }
        }
    }
}
