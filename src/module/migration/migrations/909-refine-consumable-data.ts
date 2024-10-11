import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { ConsumableSystemSource } from "@item/consumable/data.ts";
import { ConsumableCategory } from "@item/consumable/types.ts";
import {
    CONSUMABLE_CATEGORIES,
    DAMAGE_ONLY_CONSUMABLE_CATEGORIES,
    DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES,
} from "@item/consumable/values.ts";
import { DamageType } from "@system/damage/index.ts";
import { DAMAGE_TYPES } from "@system/damage/values.ts";
import { setHasElement } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Crunch down some needless "value objects" in consumable data, expand damage formula data */
export class Migration909RefineConsumableData extends MigrationBase {
    static override version = 0.909;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type !== "consumable") return;

        const system: MaybeWithOldSystemData = source.system;

        const autoDestroy = R.isPlainObject(system.autoDestroy)
            ? !!system.autoDestroy.value
            : (system.uses?.autoDestroy ?? true);
        if ("autoDestroy" in system) {
            system["-=autoDestroy"] = null;
        }

        if ("charges" in system) {
            if (R.isPlainObject(system.charges)) {
                const value = Math.min(Math.max(Math.floor(Number(system.charges.value) || 0), 0), 9999);
                const max = Math.min(Math.max(Math.floor(Number(system.charges.max) || 0), 0), 9999);
                system.uses = { value, max, autoDestroy };
                if (system.uses.max === 0) {
                    system.uses.value = 1;
                    system.uses.max = 1;
                }
            }
            system["-=charges"] = null;
        }

        if ("consumableType" in system) {
            if (R.isPlainObject(system.consumableType)) {
                const category = system.consumableType.value === "tool" ? "toolkit" : system.consumableType.value;
                system.category = setHasElement(CONSUMABLE_CATEGORIES, category) ? category : "other";
            }
            system["-=consumableType"] = null;
        }
        // Data correction
        if (system.slug === "fang-snare") system.category = "snare";

        if ("consume" in system) {
            if (R.isPlainObject(system.consume)) {
                const traits: string[] = source.system.traits.value;
                const formula = typeof system.consume.value === "string" ? system.consume.value.trim() || null : null;
                const type = formula
                    ? this.#determineDamageType(system.category, traits, system.description.value)
                    : null;
                const kind =
                    DAMAGE_ONLY_CONSUMABLE_CATEGORIES.has(system.category) ||
                    !["vitality", "void", "untyped"].includes(type ?? "")
                        ? "damage"
                        : "healing";
                system.damage = formula === null || type === null ? null : { formula, kind, type };
            }
            system["-=consume"] = null;
        }
        if (!DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES.has(system.category)) {
            system.damage = null;
        }
    }

    #determineDamageType(category: ConsumableCategory, traits: string[], description: string): DamageType {
        const damageTypes = Array.from(DAMAGE_TYPES);
        const fromTraits = damageTypes.find((t) => traits.includes(t));
        const fromDescription =
            !fromTraits && category === "snare"
                ? damageTypes.find((t) => new RegExp(String.raw`\b${t}\b`).test(description))
                : null;
        return fromTraits ?? fromDescription ?? "untyped";
    }
}

type MaybeWithOldSystemData = Omit<ConsumableSystemSource, "autoDestroy"> & {
    autoDestroy?: unknown;
    "-=autoDestroy"?: null;
    "-=charges"?: null;
    "-=consumableType"?: null;
    "-=consume"?: null;
};
