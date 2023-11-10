import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellDamageSource, SpellSystemSource } from "@item/spell/data.ts";
import { MagicTradition, SpellTrait } from "@item/spell/types.ts";
import { DamageCategoryUnique, DamageType, MaterialDamageEffect } from "@system/damage/types.ts";
import { isObject, tupleHasValue } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";

/** Simplify data structure of spells, add damage `kinds` */
export class Migration882SpellDataReorganization extends MigrationBase {
    static override version = 0.882;

    #ensureTraitsPresence(system: MaybeOldSpellSystemSource): { value: SpellTrait[] } {
        return mergeObject({ value: [] }, system.traits ?? { value: [] });
    }

    override async updateItem(
        source: DeepPartial<ItemSourcePF2e>,
        actorSource?: ActorSourcePF2e,
        /** Whether this is the top level of the spell item rather than internal partial data */
        { topLevel = true } = {},
    ): Promise<void> {
        if (source.type !== "spell") return;
        const system: MaybeOldSpellSystemSource = source.system ?? {};

        // Flatten traditions object
        if (isObject(system.traditions) && "value" in system.traditions && Array.isArray(system.traditions.value)) {
            system.traits = this.#ensureTraitsPresence(system);
            system.traits.traditions = [...system.traditions.value].sort();
        }
        if ("traditions" in system) system["-=traditions"] = null;

        // Add focus trait if a focus spell
        if (system.category?.value === "focus") {
            const traits = (system.traits = this.#ensureTraitsPresence(system));
            traits.value.push("focus");
        }

        // Remove `components`, adding to traits as necessary
        if (isObject(system.components)) {
            if (system.components.verbal) {
                const traits = (system.traits = this.#ensureTraitsPresence(system));
                traits.value.push("concentrate");
            }
            if (system.components.material || system.components.somatic) {
                const traits = (system.traits = this.#ensureTraitsPresence(system));
                traits.value.push("manipulate");
            }
        }
        if ("components" in system) system["-=components"] = null;

        // Move `materials` to `requirements`
        if (isObject(system.materials) && typeof system.materials.value === "string") {
            system.requirements = system.materials.value;
        } else if (topLevel) {
            system.requirements ||= "";
        }
        if ("materials" in system) system["-=materials"] = null;

        // Move `sustained` to under `duration`
        if (topLevel) {
            system.duration = {
                value: system.duration?.value ?? "",
                sustained: isObject(system.sustained)
                    ? !!system.sustained.value || system.duration?.value?.includes("sustained") || false
                    : system.duration?.sustained ?? false,
            };
        }
        if ("sustained" in system) system["-=sustained"] = null;

        // Shorten `hasCounteractCheck.value` to `counteracts`
        if (isObject(system.hasCounteractCheck)) {
            system.counteraction = !!system.hasCounteractCheck.value;
        } else if (topLevel) {
            system.counteraction ??= false;
        }
        if ("hasCounteractCheck" in system) {
            system["-=hasCounteractCheck"] = null;
        }

        // Replace `save` with `defense`
        if (
            isObject(system.save) &&
            typeof system.save?.value === "string" &&
            tupleHasValue(SAVE_TYPES, system.save.value)
        ) {
            system.defense = {
                save: { statistic: system.save.value, basic: !!system.save.basic },
            };
        }
        if (topLevel) system.defense ??= null;
        if ("save" in system) system["-=save"] = null;

        // Flatten `damage` object
        const oldSpellDamage: Record<string, unknown> = system.damage ?? {};
        const damage = deepClone(
            isObject(system.damage) && "value" in system.damage ? system.damage.value : system.damage ?? {},
        ) as Record<string, SpellDamagePartialWithOldData> & Record<`-=${string}`, null | undefined>;
        system.damage = topLevel || !!system.damage ? (damage as Record<string, SpellDamageSource>) : undefined;

        for (const [key, oldValue] of Object.entries(oldSpellDamage)) {
            if (key === "value" || !isObject(oldValue)) damage[`-=${key}`] = null;
        }

        for (const damagePartial of Object.values(damage)) {
            if (!isObject(damagePartial)) continue;

            if ("value" in damagePartial && typeof damagePartial.value === "string") {
                damagePartial.formula = damagePartial.value;
                delete damagePartial.value;
            }

            if (isObject(damagePartial.type)) {
                const oldTypeData = damagePartial.type;
                damagePartial.type = oldTypeData.value;
                damagePartial.category = oldTypeData.subtype || null;
                damagePartial.materials = oldTypeData.categories;
            }
        }

        // Remove `spellType`, adding to damage kinds if healing
        if (isObject(system.spellType)) {
            if (system.spellType.value === "attack" && !system.traits?.value?.includes("attack")) {
                const traits = (system.traits = this.#ensureTraitsPresence(system));
                traits.value.push("attack");
            } else if (system.spellType.value === "heal") {
                for (const damagePartial of Object.values(system.damage ?? {})) {
                    if (damagePartial) damagePartial.kinds = ["healing"];
                }
            }

            for (const damagePartial of Object.values(system.damage ?? {})) {
                if (damagePartial) damagePartial.kinds ??= ["damage"];
            }
        }
        if ("spellType" in system) system["-=spellType"] = null;

        // Remove `category`, setting up ritual data if necessary
        if (isObject(system.category) && "value" in system.category && system.category.value === "ritual") {
            const primaryCheck =
                isObject(system.primarycheck) && typeof system.primarycheck.value === "string"
                    ? system.primarycheck.value.trim()
                    : "";
            const secondaryChecks =
                isObject(system.secondarycheck) && typeof system.secondarycheck.value === "string"
                    ? system.secondarycheck.value.trim()
                    : "";
            const secondaryCasters = isObject(system.secondarycasters) ? Number(system.secondarycasters.value) || 0 : 0;
            system.ritual = {
                primary: { check: primaryCheck },
                secondary: { checks: secondaryChecks, casters: secondaryCasters },
            };
        }
        if ("category" in system) system["-=category"] = null;
        if ("primarycheck" in system) system["-=primarycheck"] = null;
        if ("secondarycheck" in system) system["-=secondarycheck"] = null;
        if ("secondarycasters" in system) system["-=secondarycasters"] = null;

        // Remove school traits from aura REs
        for (const rule of source.system?.rules ?? []) {
            if (isObject(rule) && "traits" in rule && Array.isArray(rule.traits)) {
                rule.traits = rule.traits.filter((t) => !schools.includes(t));
            }
        }

        // Final traits cleanup
        const schools = ["conjuration", "divination", "enchantment", "evocation", "necromancy", "transmutation"];
        if (system.traits?.value && Array.isArray(system.traits.value)) {
            system.traits.value = R.uniq(
                R.compact(system.traits.value)
                    .filter((t: string) => !schools.includes(t))
                    .sort(),
            );
        }

        // Remove random legacy cruft
        const oldKeys = ["ability", "areatype", "damageType", "prepared", "rarity", "spellCategorie", "usage"] as const;
        for (const key of oldKeys) {
            if (key in system) system[`-=${key}`] = null;
        }

        // Repeat for heightening and overlays
        if (isObject(system.heightening) && system.heightening.type === "fixed") {
            for (const spellPartial of Object.values(system.heightening.levels ?? {})) {
                await this.updateItem({ name: source.name, type: "spell", system: spellPartial }, actorSource, {
                    topLevel: false,
                });
            }
        }

        for (const overlay of Object.values(system?.overlays ?? {})) {
            if (overlay.overlayType === "override") {
                await this.updateItem(
                    {
                        name: overlay.name ?? source.name,
                        type: "spell",
                        system: overlay.system ?? {},
                    },
                    actorSource,
                    { topLevel: false },
                );
            }
        }
    }
}

type MaybeOldSpellSystemSource = Omit<DeepPartial<SpellSystemSource>, "traditions"> & {
    spellType?: { value?: string };
    "-=spellType"?: null;

    category?: { value: string };
    "-=category"?: null;

    traditions?: { value?: MagicTradition[] };
    "-=traditions"?: null;

    components?: Record<string, boolean>;
    "-=components"?: null;

    materials?: { value?: unknown };
    "-=materials"?: null;

    sustained?: { value?: unknown };
    "-=sustained"?: null;

    save?: OldSaveData;
    "-=save"?: null;

    primarycheck?: { value: unknown };
    "-=primarycheck"?: null;
    secondarycheck?: { value: unknown };
    "-=secondarycheck"?: null;
    secondarycasters?: { value: unknown };
    "-=secondarycasters"?: null;

    hasCounteractCheck?: { value?: unknown };
    "-=hasCounteractCheck"?: null;

    damage?: Record<string, SpellDamagePartialWithOldData> | { value?: Record<string, SpellDamagePartialWithOldData> };

    // Random legacy cruft
    "-=ability"?: null;
    "-=areatype"?: null;
    "-=damageType"?: null;
    "-=prepared"?: null;
    "-=rarity"?: null;
    "-=spellCategorie"?: null;
    "-=usage"?: null;
};

type SpellDamagePartialWithOldData = Omit<SpellDamageSource, "type"> & {
    type: DamageType | OldSpellDamageType;
    value?: string;
};

interface OldSpellDamageType {
    value: DamageType;
    subtype?: DamageCategoryUnique;
    categories: MaterialDamageEffect[];
}

interface OldSaveData {
    basic: string;
    value: SaveType | "";
    dc?: number;
    str?: string;
}
