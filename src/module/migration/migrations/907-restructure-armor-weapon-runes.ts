import { ArmorSystemSource } from "@item/armor/data.ts";
import { ARMOR_PROPERTY_RUNE_TYPES } from "@item/armor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { WeaponSystemSource } from "@item/weapon/data.ts";
import { WEAPON_PROPERTY_RUNE_TYPES } from "@item/weapon/values.ts";
import { OneToThree } from "@module/data.ts";
import { ErrorPF2e, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Move armor and weapon runes to a single object. */
export class Migration907RestructureArmorWeaponRunes extends MigrationBase {
    static override version = 0.907;

    #RESILIENT_RUNE_CONVERSION = new Map<string, OneToThree>([
        ["resilient", 1],
        ["greaterResilient", 2],
        ["majorResilient", 3],
    ]);

    #STRIKING_RUNE_CONVERSION = new Map<string, OneToThree>([
        ["striking", 1],
        ["greaterStriking", 2],
        ["majorStriking", 3],
    ]);

    #RUNE_DELETIONS = [
        "potencyRune",
        "resiliencyRune",
        "strikingRune",
        "propertyRune1",
        "propertyRune2",
        "propertyRune3",
        "propertyRune4",
    ] as const;

    #cleanupSpecificData(system: ArmorSystemSource | WeaponSystemSource): void {
        const specificData: unknown = system.specific;
        if (R.isPlainObject(specificData)) {
            if ("price" in specificData) {
                specificData["-=price"] = null;
            }
            if (specificData.value === true) {
                specificData["-=value"] = null;
                specificData.runes = fu.deepClone(system.runes);
                if (R.isPlainObject(specificData.material) && "precious" in specificData.material) {
                    specificData.material["-=precious"] = null;
                    specificData.material = fu.mergeObject(specificData.material, fu.deepClone(system.material));
                } else {
                    specificData.material = fu.deepClone(system.material);
                }
            } else if ("value" in specificData) {
                system.specific = null;
            }
        }
    }

    #getRuneValue(system: unknown, key: OldRunePropertyKey): unknown {
        if (!R.isPlainObject(system)) throw ErrorPF2e("Unexpected system data");
        const runeObject = system[key];
        return R.isPlainObject(runeObject) ? runeObject.value : null;
    }

    override async updateItem(source: MaybeWithRuneDeletions): Promise<void> {
        if (itemIsOfType(source, "armor", "weapon")) {
            if (source.type === "armor") {
                source.system.runes ??= { potency: 0, resilient: 0, property: [] };
            } else if (source.type === "weapon") {
                source.system.runes ??= { potency: 0, striking: 0, property: [] };
            }
            if ("potencyRune" in source.system && R.isPlainObject(source.system.potencyRune)) {
                const potencyRune = Number(source.system.potencyRune.value) || 0;
                source.system.runes.potency = tupleHasValue([1, 2, 3, 4], potencyRune) ? potencyRune : 0;
            }
        }

        if (source.type === "armor") {
            if ("resiliencyRune" in source.system && R.isPlainObject(source.system.resiliencyRune)) {
                const resilientRune = String(source.system.resiliencyRune.value);
                const numericValue = this.#RESILIENT_RUNE_CONVERSION.get(resilientRune) ?? 0;
                source.system.runes.resilient = numericValue;
            }
            for (const runeKey of ["propertyRune1", "propertyRune2", "propertyRune3", "propertyRune4"] as const) {
                if (!(runeKey in source.system)) continue;
                const runeValue = this.#getRuneValue(source.system, runeKey);
                if (setHasElement(ARMOR_PROPERTY_RUNE_TYPES, runeValue)) {
                    source.system.runes.property.push(runeValue);
                    source.system.runes.property = R.unique(source.system.runes.property).filter(R.isTruthy);
                    source.system.runes.property.length = Math.min(source.system.runes.property.length, 4);
                }
            }
            this.#cleanupSpecificData(source.system);
        } else if (source.type === "weapon") {
            if ("strikingRune" in source.system && R.isPlainObject(source.system.strikingRune)) {
                const strikingRune = String(source.system.strikingRune.value);
                const numericValue = this.#STRIKING_RUNE_CONVERSION.get(strikingRune) ?? 0;
                source.system.runes.striking = numericValue;
            }

            for (const runeKey of ["propertyRune1", "propertyRune2", "propertyRune3", "propertyRune4"] as const) {
                if (!(runeKey in source.system)) continue;
                const runeValue = this.#getRuneValue(source.system, runeKey);
                if (setHasElement(WEAPON_PROPERTY_RUNE_TYPES, runeValue)) {
                    source.system.runes.property.push(runeValue);
                    source.system.runes.property = R.unique(source.system.runes.property).filter(R.isTruthy);
                    source.system.runes.property.length = Math.min(source.system.runes.property.length, 4);
                }
            }
            this.#cleanupSpecificData(source.system);
        }

        for (const deletion of this.#RUNE_DELETIONS) {
            if (deletion in source.system) source.system[`-=${deletion}`] = null;
        }
    }
}

type OldRunePropertyKey =
    | "potencyRune"
    | "resiliencyRune"
    | "strikingRune"
    | "propertyRune1"
    | "propertyRune2"
    | "propertyRune3"
    | "propertyRune4";

type MaybeWithRuneDeletions = ItemSourcePF2e & {
    system: {
        [K in `-=${OldRunePropertyKey}`]?: null;
    };
};
