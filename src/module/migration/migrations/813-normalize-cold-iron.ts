import { ItemSourcePF2e, WeaponSource } from "@item/base/data/index.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Normalize "cold-iron" slug in armor, weapon and melee items */
export class Migration813NormalizeColdIron extends MigrationBase {
    static override version = 0.813;

    override async updateItem(source: MaybeWithOldMaterialData): Promise<void> {
        switch (source.type) {
            case "melee": {
                const traits: { value: string[] } = source.system.traits;
                traits.value = traits.value.map((t) => t.replace(/^coldiron$/i, "cold-iron"));
                return;
            }
            case "armor":
            case "weapon": {
                const preciousMaterial = source.system.preciousMaterial;
                if (typeof preciousMaterial?.value !== "string") return;
                preciousMaterial.value &&= preciousMaterial.value.replace(/^coldiron$/i, "cold-iron");

                if (source.type === "weapon") {
                    this.#updateWeaponMaterialData(source);
                }
                return;
            }
        }

        const choiceSets = source.system.rules.filter(
            (r): r is ArrayChoiceSet =>
                r.key === "ChoiceSet" &&
                "choices" in r &&
                Array.isArray(r.choices) &&
                r.choices.every((c) => isObject(c) && "value" in c && typeof c.value === "string"),
        );
        for (const choiceSet of choiceSets) {
            this.#updateChoiceSet(choiceSet);
        }
    }

    #updateWeaponMaterialData(source: WeaponSource): void {
        // Material was logged in specific-magic-item data but ended up not being needed
        if (source.type !== "weapon" || !isObject(source.system.specific)) {
            return;
        }

        const specificData: SpecificMagicData = source.system.specific;
        if (!specificData.value) {
            delete specificData.material;
            delete specificData.price;
            delete specificData.runes;
            specificData["-=material"] = null;
            specificData["-=price"] = null;
            specificData["-=runes"] = null;
        }

        const material = specificData.material;
        if (material?.precious) {
            material.precious.type &&= material.precious?.type.replace(/^coldiron$/i, "cold-iron");
            delete material.base;
            material["-=base"] = null;
        } else if (typeof material?.type === "string" && typeof material.grade === "string") {
            material.precious = {
                type: material.type.replace(/^coldiron$/i, "cold-iron"),
                grade: material.grade,
            };
            delete material.type;
            delete material.grade;
            material["-=type"] = null;
            material["-=grade"] = null;
        }
    }

    #updateChoiceSet(choiceSet: ArrayChoiceSet): void {
        for (const choice of choiceSet.choices) {
            if (/coldiron/i.test(String(choice.value))) {
                choice.value = "cold-iron";
            }
        }

        if (/coldiron/i.test(String(choiceSet.selection))) {
            choiceSet.selection = "cold-iron";
        }
    }
}

interface SpecificMagicData {
    value: boolean;
    price?: unknown;
    "-=price"?: null;
    material?: {
        precious?: { type?: string; grade?: string };
        base?: unknown;
        "-=base"?: null;
        type?: string;
        "-=type"?: null;
        grade?: string;
        "-=grade"?: null;
    };
    "-=material"?: null;
    runes?: unknown;
    "-=runes"?: null;
}

interface ArrayChoiceSet {
    key: "ChoiceSet";
    choices: { value?: unknown }[];
    selection?: unknown;
}

type MaybeWithOldMaterialData = ItemSourcePF2e & {
    system: {
        preciousMaterial?: { value?: unknown };
        preciousMaterialGrade?: { value?: unknown };
    };
};
