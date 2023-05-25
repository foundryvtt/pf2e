import type { DamageType } from "@system/damage/types.ts";
import { objectHasKey, setHasElement, tupleHasValue } from "@util";
import { WeaponPF2e } from "./document.ts";
import { WeaponPropertyRuneType } from "./types.ts";
import { CharacterPF2e } from "@actor";
import { StrikeRuleElement } from "@module/rules/rule-element/strike.ts";

/** A helper class to handle toggleable weapon traits */
class WeaponTraitToggles {
    #weapon: WeaponPF2e;

    constructor(weapon: WeaponPF2e) {
        this.#weapon = weapon;
    }

    get modular(): { options: DamageType[]; selection: DamageType | null } {
        const options = this.#resolveOptions("modular");
        const sourceSelection = this.#weapon._source.system.traits.toggles?.modular?.selection;
        const selection = tupleHasValue(options, sourceSelection)
            ? sourceSelection
            : // If the weapon's damage type is represented among the modular options, set the selection to it
            options.includes(this.#weapon.system.damage.damageType)
            ? this.#weapon.system.damage.damageType
            : null;

        return { options, selection };
    }

    get versatile(): { options: DamageType[]; selection: DamageType | null } {
        const options = this.#resolveOptions("versatile");
        const sourceSelection = this.#weapon._source.system.traits.toggles?.versatile?.selection ?? null;
        const selection = tupleHasValue(options, sourceSelection) ? sourceSelection : null;

        return { options, selection };
    }

    /** Collect selectable damage types among a list of toggleable weapon traits */
    #resolveOptions(toggle: "modular" | "versatile"): DamageType[] {
        const types = this.#weapon.system.traits.value
            .filter((t) => t.startsWith(toggle))
            .flatMap((trait): DamageType | DamageType[] => {
                if (trait === "modular") return ["bludgeoning", "piercing", "slashing"];

                const damageType = /^versatile-(\w+)$/.exec(trait)?.at(1);
                switch (damageType) {
                    case "b":
                        return "bludgeoning";
                    case "p":
                        return "piercing";
                    case "s":
                        return "slashing";
                    default: {
                        return objectHasKey(CONFIG.PF2E.damageTypes, damageType) ? damageType : [];
                    }
                }
            });

        const allOptions = Array.from(new Set(types));
        return toggle === "modular"
            ? allOptions
            : // Filter out any versatile options that are the same as the weapon's base damage type
              allOptions.filter((t) => this.#weapon.system.damage.damageType !== t);
    }
}

/**
 * Update a modular or versatile weapon to change its damage type
 * @returns A promise indicating whether an update was made
 */
async function toggleWeaponTrait({ weapon, trait, selection }: ToggleWeaponTraitParams): Promise<boolean> {
    const current = weapon.system.traits.toggles[trait].selection;
    if (current === selection) return false;

    const item = weapon.actor?.items.get(weapon.id);
    if (item?.isOfType("weapon") && item === weapon) {
        await item.update({ [`system.traits.toggles.${trait}.selection`]: selection });
    } else if (item?.isOfType("weapon") && weapon.altUsageType === "melee") {
        item.update({ [`system.meleeUsage.traitToggles.${trait}`]: selection });
    } else {
        const rule = item?.rules.find(
            (r): r is StrikeRuleElement => r.key === "Strike" && !r.ignored && r.slug === weapon.slug
        );
        await rule?.toggleTrait({ trait, selection });
    }

    return true;
}

interface ToggleWeaponTraitParams {
    weapon: WeaponPF2e<CharacterPF2e>;
    trait: "modular" | "versatile";
    selection: DamageType | null;
}

/** Remove duplicate and lesser versions from an array of property runes */
function prunePropertyRunes(runes: WeaponPropertyRuneType[]): WeaponPropertyRuneType[] {
    const runeSet = new Set(runes);
    return Array.from(runeSet).filter((r) => !setHasElement(runeSet, `greater${r.titleCase()}`));
}

export { WeaponTraitToggles, prunePropertyRunes, toggleWeaponTrait };
