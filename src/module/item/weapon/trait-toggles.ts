import type { ActorPF2e } from "@actor";
import type { ItemPF2e, WeaponPF2e } from "@item";
import { ModularConfig } from "@item/base/data/system.ts";
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

    get modular(): { options: ModularConfig[]; selected: number; config: ModularConfig } | null {
        const weapon = this.parent;
        const traits = weapon.system.traits;
        if (!traits.value.includes("modular")) return null;

        const existing = traits.config.modular?.length ? traits.config.modular : null;
        const options = existing ?? [
            { damageType: "bludgeoning", traits: [] },
            { damageType: "piercing", traits: [] },
            { damageType: "slashing", traits: [] },
        ];
        const selected = weapon._source.system.traits.toggles?.modular?.selected ?? 0;
        const config = options.at(selected) ?? options[0];
        return { options, selected, config };
    }

    get versatile(): { options: DamageType[]; selected: DamageType | null } {
        const options = this.#resolveOptions("versatile");
        const sourceSelection = this.parent._source.system.traits.toggles?.versatile?.selected ?? null;
        const selected = tupleHasValue(options, sourceSelection) ? sourceSelection : null;

        return { options, selected };
    }

    /** Collect selectable damage types among a list of toggleable weapon traits */
    #resolveOptions(toggle: "versatile"): DamageType[] {
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
        return allOptions.filter((t) => weapon.system.damage.damageType !== t);
    }

    applyChanges(): void {
        const weapon = this.parent;
        if (this.doubleBarrel.selected && !weapon.flags[SYSTEM_ID].damageFacesUpgraded) {
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
    async update(options: ToggleWeaponTraitParams): Promise<boolean> {
        const weapon = this.parent;
        if (!weapon.actor?.isOfType("character")) return false;

        const { trait, selected } = options;
        const property = trait === "double-barrel" ? "doubleBarrel" : trait;
        if (this[property]?.selected === selected) return false;

        const target = this.#resolveTarget(options);
        if (!target) {
            console.warn(
                `${SYSTEM_NAME} System | Unable to resolve an update target for ${weapon.name}'s ${trait} toggle`,
            );
            return false;
        }

        if ("rule" in target) {
            await target.rule.toggleTrait(target.options);
        } else {
            const value = property === "doubleBarrel" ? !!selected : selected;
            await target.document.update({ [target.path]: value });
        }

        return true;
    }

    /** Find the document and key path that persist a toggle, or the Strike rule element that owns it */
    #resolveTarget(options: ToggleWeaponTraitParams): ToggleUpdateTarget | null {
        const weapon = this.parent;
        const item = weapon.realItem;
        const trait = options.trait;
        if (item?.isOfType("weapon") && item === weapon) {
            const property = trait === "double-barrel" ? "doubleBarrel" : trait;
            return { document: item, path: `system.traits.toggles.${property}.selected` };
        }
        if (item?.isOfType("weapon") && weapon.altUsageType === "melee") {
            return { document: item, path: `system.meleeUsage.traitToggles.${trait}` };
        }
        if (trait === "versatile" && item?.isOfType("shield")) {
            return { document: item, path: "system.traits.integrated.versatile.selected" };
        }
        if (options.trait === "double-barrel") return null;
        if (weapon.rule) return { rule: weapon.rule, options };
        if (weapon.slug === "basic-unarmed" && weapon.actor) {
            return { document: weapon.actor, path: `flags.${SYSTEM_ID}.basicUnarmedToggles.${trait}` };
        }
        return null;
    }
}

type ToggleUpdateTarget =
    | { document: ActorPF2e | ItemPF2e; path: string }
    | { rule: StrikeRuleElement; options: ToggleModularVersatileParams };

interface ToggleDoubleBarrelParams {
    trait: "double-barrel";
    selected: boolean;
}

type ToggleModularVersatileParams =
    { trait: "modular"; selected: number | null } | { trait: "versatile"; selected: DamageType | null };

type ToggleWeaponTraitParams = ToggleDoubleBarrelParams | ToggleModularVersatileParams;

export { WeaponTraitToggles };
