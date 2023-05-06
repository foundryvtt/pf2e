import type { DamageType } from "@system/damage/types.ts";
import { objectHasKey, setHasElement, tupleHasValue } from "@util";
import { WeaponPF2e } from "./document.ts";
import { WeaponPropertyRuneType } from "./types.ts";

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

        return Array.from(new Set(types));
    }
}

/** Remove duplicate and lesser versions from an array of property runes */
function prunePropertyRunes(runes: WeaponPropertyRuneType[]): WeaponPropertyRuneType[] {
    const runeSet = new Set(runes);
    return Array.from(runeSet).filter((r) => !setHasElement(runeSet, `greater${r.titleCase()}`));
}

export { prunePropertyRunes, WeaponTraitToggles };
