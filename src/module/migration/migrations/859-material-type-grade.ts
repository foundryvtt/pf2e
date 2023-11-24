import { ItemSourcePF2e, PhysicalItemSource } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES } from "@item/physical/values.ts";
import { WeaponMaterialType } from "@item/weapon/types.ts";
import { isObject, setHasElement } from "@util";
import { MigrationBase } from "../base.ts";

/** Move physical-item material data to a single property. */
export class Migration859MaterialTypeGrade extends MigrationBase {
    static override version = 0.859;

    #hasOldMaterialData(source: PhysicalItemSource): source is ItemWithOldMaterialData {
        return (
            "preciousMaterial" in source.system &&
            isObject(source.system.preciousMaterial) &&
            "preciousMaterialGrade" in source.system &&
            isObject(source.system.preciousMaterialGrade)
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (itemIsOfType(source, "physical") && this.#hasOldMaterialData(source)) {
            const { preciousMaterial, preciousMaterialGrade } = source.system;
            const type = setHasElement(PRECIOUS_MATERIAL_TYPES, preciousMaterial?.value)
                ? preciousMaterial?.value ?? null
                : null;
            const grade = setHasElement(PRECIOUS_MATERIAL_GRADES, preciousMaterialGrade?.value)
                ? preciousMaterialGrade?.value ?? null
                : null;

            source.system.material = { type: type as WeaponMaterialType | null, grade };

            if ("game" in globalThis) {
                source.system["-=preciousMaterial"] = null;
                source.system["-=preciousMaterialGrade"] = null;
            } else {
                delete source.system.preciousMaterial;
                delete source.system.preciousMaterialGrade;
            }
        }
    }
}

type ItemWithOldMaterialData = PhysicalItemSource & {
    system: {
        preciousMaterial?: { value?: unknown };
        "-=preciousMaterial": null;
        preciousMaterialGrade?: { value?: unknown };
        "-=preciousMaterialGrade": null;
    };
};
