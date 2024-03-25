import type { ActorPF2e } from "@actor";
import type { WeaponPF2e } from "@item";
import type { StrikeRuleElement } from "@module/rules/rule-element/strike.ts";
import { nextDamageDieSize } from "@system/damage/helpers.ts";
import type { DamageType } from "@system/damage/types.ts";
import { objectHasKey, tupleHasValue } from "@util";
import { upgradeWeaponTrait } from "./helpers.ts";

/** A helper class to handle toggleable weapon traits */
class WeaponTraitToggles {
    parent: WeaponPF2e;

    constructor(weapon: WeaponPF2e) {
        this.parent = weapon;
        Object.defineProperty(this, "parent", { enumerable: false });
    }

    get actor(): ActorPF2e | null {
        return this.parent.actor;
    }

    get doubleBarrel(): { selected: boolean } {
        const weapon = this.parent;
        const hasTrait = weapon.system.traits.value.includes("double-barrel");
        const sourceToggles = weapon._source.system.traits.toggles;
        const selected = hasTrait && weapon.isRanged && !weapon.isThrown && !!sourceToggles?.doubleBarrel?.selected;

        return { selected };
    }

    get modular(): { options: DamageType[]; selected: DamageType | null } {
        const weapon = this.parent;
        const options = this.#resolveOptions("modular");
        const sourceSelection = weapon._source.system.traits.toggles?.modular?.selected;
        const selected = tupleHasValue(options, sourceSelection)
            ? sourceSelection
            : // If the weapon's damage type is represented among the modular options, set the selection to it
              options.includes(weapon.system.damage.damageType)
              ? weapon.system.damage.damageType
              : null;

        return { options, selected };
    }

    get versatile(): { options: DamageType[]; selected: DamageType | null } {
        const options = this.#resolveOptions("versatile");
        const sourceSelection = this.parent._source.system.traits.toggles?.versatile?.selected ?? null;
        const selected = tupleHasValue(options, sourceSelection) ? sourceSelection : null;

        return { options, selected };
    }

    /** Collect selectable damage types among a list of toggleable weapon traits */
    #resolveOptions(toggle: "modular" | "versatile"): DamageType[] {
        const weapon = this.parent;
        const types = weapon.system.traits.value
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
              allOptions.filter((t) => weapon.system.damage.damageType !== t);
    }

    applyChanges(): void {
        const weapon = this.parent;
        if (this.doubleBarrel.selected && !weapon.flags.pf2e.damageFacesUpgraded) {
            weapon.system.damage.die &&= nextDamageDieSize({ upgrade: weapon.system.damage.die });
            const traits = weapon.system.traits;
            const fatalTrait = traits.value.find((t) => /^fatal-d\d{1,2}$/.test(t));
            if (fatalTrait) {
                const index = traits.value.indexOf(fatalTrait);
                traits.value.splice(index, 1, upgradeWeaponTrait(fatalTrait));
            }
        }
    }

    /**
     * Update a modular or versatile weapon to change its damage type
     * @returns A promise indicating whether an update was made
     */
    async update({ trait, selected }: ToggleWeaponTraitParams): Promise<boolean> {
        const weapon = this.parent;
        const actor = weapon.actor;
        if (!actor?.isOfType("character")) return false;

        const property = trait === "double-barrel" ? "doubleBarrel" : trait;
        const current = this[property].selected;
        if (current === selected) return false;

        const item = actor.items.get(weapon.id);
        if (item?.isOfType("weapon") && item === weapon) {
            const value = property === "doubleBarrel" ? !!selected : selected;
            await item.update({ [`system.traits.toggles.${property}.selected`]: value });
        } else if (item?.isOfType("weapon") && weapon.altUsageType === "melee") {
            item.update({ [`system.meleeUsage.traitToggles.${trait}`]: selected });
        } else if (trait === "versatile" && item?.isOfType("shield")) {
            item.update({ "system.traits.integrated.versatile.selected": selected });
        } else if (trait !== "double-barrel") {
            const rule = item?.rules.find(
                (r): r is StrikeRuleElement => r.key === "Strike" && !r.ignored && r.slug === weapon.slug,
            );
            await rule?.toggleTrait({ trait, selected });
        }

        return true;
    }
}

interface ToggleDoubleBarrelParams {
    trait: "double-barrel";
    selected: boolean;
}

interface ToggleModularVersatileParams {
    trait: "modular" | "versatile";
    selected: DamageType | null;
}

type ToggleWeaponTraitParams = ToggleDoubleBarrelParams | ToggleModularVersatileParams;

export { WeaponTraitToggles };
