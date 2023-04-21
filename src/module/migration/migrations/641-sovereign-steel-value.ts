import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Fix precious material value of "sovereign steel" */
export class Migration641SovereignSteelValue extends MigrationBase {
    static override version = 0.641;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "weapon") return;
        const material: { value: string | null } = source.system.preciousMaterial;
        if (material.value?.toLowerCase() === "sovereign steel") {
            material.value = "sovereignSteel";
        }
    }
}
