import { ActorSourcePF2e } from "@actor/data/index.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { SpellSystemSource } from "@item/spell/data.ts";
import { MagicTradition, SpellTrait } from "@item/spell/types.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { DamageType } from "@system/damage/types.ts";
import { DAMAGE_CATEGORIES_UNIQUE, DAMAGE_TYPES } from "@system/damage/values.ts";
import { isObject, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import { MigrationBase } from "../base.ts";

/** Simplify data structure of spells, add damage `kinds` */
export class Migration882SpellDataReorganization extends MigrationBase {
    static override version = 0.882;

    #SCHOOL_TRAITS = new Set([
        "abjuration",
        "conjuration",
        "divination",
        "enchantment",
        "evocation",
        "necromancy",
        "transmutation",
    ]);

    #DAMAGE_TYPES = new Set([...DAMAGE_TYPES, "good", "evil", "lawful", "chaotic"]);

    #ensureTraitsPresence(system: MaybeOldSpellSystemSource): { value: SpellTrait[] } {
        return fu.mergeObject({ value: [] }, system.traits ?? { value: [] });
    }

    #migrateRule(rule: DeepPartial<RuleElementSource>): DeepPartial<RuleElementSource> | never[] {
        if ("type" in rule) {
            if (typeof rule.type === "string" && this.#SCHOOL_TRAITS.has(rule.type)) {
                return [];
            } else if (Array.isArray(rule.type)) {
                rule.type = rule.type.filter((t) => !this.#SCHOOL_TRAITS.has(t));
            }
        }

        // Remove school traits from aura REs
        if ("traits" in rule && Array.isArray(rule.traits)) {
            rule.traits = rule.traits.filter((t) => !this.#SCHOOL_TRAITS.has(t));
        }
        if (Array.isArray(rule.predicate)) {
            rule.predicate = rule.predicate.filter((s) => !this.#SCHOOL_TRAITS.has(s));
        }

        return rule;
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        const traits: { value: string[] } = source.system.traits ?? { value: [] };
        if (Array.isArray(traits.value)) {
            traits.value = R.unique(traits.value.filter((t) => !this.#SCHOOL_TRAITS.has(t)))
                .filter(R.isTruthy)
                .sort();
        }

        source.system.attributes.immunities = source.system.attributes.immunities?.filter(
            (i) => !this.#SCHOOL_TRAITS.has(i.type),
        );
        source.system.attributes.weaknesses = source.system.attributes.weaknesses?.filter(
            (i) => !this.#SCHOOL_TRAITS.has(i.type),
        );
        source.system.attributes.resistances = source.system.attributes.resistances?.filter(
            (i) => !this.#SCHOOL_TRAITS.has(i.type),
        );
    }

    override async updateItem(
        source: DeepPartial<ItemSourcePF2e>,
        actorSource?: ActorSourcePF2e,
        /** Whether this is the top level of the spell item rather than internal partial data */
        { topLevel = true } = {},
    ): Promise<void> {
        if (topLevel && source.system?.rules) {
            source.system.rules = source.system.rules.flatMap((r) => (r ? this.#migrateRule(r) : r));
        }

        // Remove school traits from any item
        const traits: { value?: (string | undefined)[] } = source.system?.traits ?? { value: [] };
        if (Array.isArray(traits.value)) {
            traits.value = R.unique(
                traits.value
                    .filter((t): t is string => !!t && !this.#SCHOOL_TRAITS.has(t))
                    .map((t) => (t === "metamagic" ? "spellshape" : t))
                    .sort(),
            );
        }

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
                    : (system.duration?.sustained ?? false),
            };
        }
        if ("sustained" in system) system["-=sustained"] = null;

        // Shorten `hasCounteractCheck.value` to `counteraction`
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
                passive: null,
                save: { statistic: system.save.value, basic: !!system.save.basic },
            };
        }
        if (topLevel) system.defense ??= null;
        if ("save" in system) system["-=save"] = null;

        // Flatten `damage` object
        const oldSpellDamage = fu.deepClone(system.damage);
        if (isObject(oldSpellDamage) && R.isPlainObject(oldSpellDamage?.value)) {
            system.damage = {};
            for (const [key, partial] of Object.entries(oldSpellDamage?.value)) {
                if (topLevel && ["lay-on-hands", "touch-of-corruption"].includes(source.system?.slug ?? "")) {
                    break;
                }
                if (!R.isPlainObject(partial)) continue;
                const typeData = R.isPlainObject(partial.type) ? partial.type : {};
                const damageType = this.#DAMAGE_TYPES.has(String(typeData.value))
                    ? typeData.value
                    : topLevel
                      ? "untyped"
                      : undefined;
                const damageCategory = setHasElement(DAMAGE_CATEGORIES_UNIQUE, typeData.subtype)
                    ? typeData.subtype
                    : topLevel
                      ? null
                      : undefined;
                system.damage[key] = {
                    applyMod: typeof partial.applyMod === "boolean" ? partial.applyMod : undefined,
                    formula: typeof partial.value === "string" ? partial.value : topLevel ? "" : undefined,
                    type: damageType as DamageType | undefined,
                    category: damageCategory,
                    materials: Array.isArray(typeData.categories) ? typeData.categories : topLevel ? [] : undefined,
                };
            }

            const damageWithDeletions: Record<string, unknown> = system.damage;
            for (const [key, oldValue] of Object.entries(oldSpellDamage)) {
                if (key === "value" || !isObject(oldValue)) damageWithDeletions[`-=${key}`] = null;
            }
        }

        // Remove `spellType`, adding to damage kinds if healing
        if (isObject(system.spellType)) {
            if (system.spellType.value === "attack" && !system.traits?.value?.includes("attack")) {
                const traits = (system.traits = this.#ensureTraitsPresence(system));
                traits.value.push("attack");
            } else if (system.spellType.value === "heal") {
                for (const [key, damagePartial] of Object.entries(system.damage ?? {})) {
                    if (key !== "value" && isObject(damagePartial)) {
                        damagePartial.kinds = ["healing"];
                    }
                }
            }

            for (const [key, damagePartial] of Object.entries(system.damage ?? {})) {
                if (key !== "value" && isObject(damagePartial)) {
                    damagePartial.kinds ??= ["damage"];
                }
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

    damage?: { value?: Record<string, unknown> };

    // Random legacy cruft
    "-=ability"?: null;
    "-=areatype"?: null;
    "-=damageType"?: null;
    "-=prepared"?: null;
    "-=rarity"?: null;
    "-=spellCategorie"?: null;
    "-=usage"?: null;
};

interface OldSaveData {
    basic: string;
    value: SaveType | "";
    dc?: number;
    str?: string;
}
