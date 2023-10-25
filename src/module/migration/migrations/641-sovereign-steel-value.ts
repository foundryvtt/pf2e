import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { MigrationBase } from "../base.ts";

/** Fix precious material value of "sovereign steel" */
export class Migration641SovereignSteelValue extends MigrationBase {
    static override version = 0.641;

    override async updateItem(source: MaybeWithOldMaterialData): Promise<void> {
        if (source.type !== "weapon") return;
        const material = source.system.preciousMaterial ?? {};
        if (material.value?.toLowerCase() === "sovereign steel") {
            material.value = "sovereignSteel";
        }
    }
}

type MaybeWithOldMaterialData = ItemSourcePF2e & {
    system: {
        preciousMaterial?: { value?: string | null };
        preciousMaterialGrade?: { value?: unknown };
    };
};
