import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString, sluggify } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/**
 * Followup migration to make all basic ammo consumable and convert predicates
 * that check for the ammo category to instead check for the ammo item type.
 */
export class Migration952AmmoTraitsAndOptions extends MigrationBase {
    static override version = 0.952;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        // All base ammo is consumable as well
        const isBasicAmmo =
            source.type === "ammo" && source.system.baseItem === (source.system.slug ?? sluggify(source.name));
        if (
            source.type === "ammo" &&
            (isBasicAmmo || source.system.baseItem === "chem-tank") &&
            source.system.baseItem !== "battery" &&
            !source.system.traits.value.includes("consumable")
        ) {
            source.system.traits.value.push("consumable");
        }

        // Batteries are rechargeable, but they were erroneously added flagged as consumable
        if (source.type === "ammo" && source.system.baseItem === "battery") {
            source.system.traits.value = source.system.traits.value.filter((v) => v !== "consumable");
        }

        // Migrate predicates that refer to the ammo category or certain implicit consumable checks to include ammo
        source.system.rules = recursiveReplaceString(source.system.rules, (s) =>
            s.endsWith(":category:ammo") ? s.replace(":category:ammo", ":type:ammo") : s,
        );
        this.#recursiveConsumableCheck(source.system.rules);
    }

    #recursiveConsumableCheck(source: unknown) {
        if (Array.isArray(source)) {
            for (const item of source) {
                this.#recursiveConsumableCheck(item);
            }
        } else if (R.isPlainObject(source)) {
            for (const [key, value] of Object.entries(source)) {
                if (
                    key === "or" &&
                    Array.isArray(value) &&
                    value.includes("item:type:consumable") &&
                    !value.includes("item:type:ammo")
                ) {
                    value.push("item:type:ammo");
                } else {
                    this.#recursiveConsumableCheck(value);
                }
            }
        }
    }
}
