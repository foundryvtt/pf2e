import type { ActorPF2e } from "@actor";
import type { WeaponPF2e } from "@item";
import { nextDamageDieSize } from "@system/damage/helpers.ts";
import type { DamageType } from "@system/damage/types.ts";
import { ErrorPF2e, objectHasKey, tupleHasValue } from "@util";
import { upgradeWeaponTrait } from "./helpers.ts";
import { ModularConfig } from "@scripts/config/modular.ts";

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

    /** Gets all the valid configurations for the weapon's modular trait */
    get modularTraitConfigs(): Record<string, ModularConfig> {
        const weapon = this.parent;
        const modulars = weapon.system.traits.value.filter((trait) => trait.startsWith("modular"));
        if (modulars.length === 0) return {};
        const configs = modulars.map((trait) => CONFIG.PF2E.modularConfigurations[trait]);
        if (configs.length === 0) return {};
        if (configs.length > 1) {
            throw ErrorPF2e("weapon with multiple valid modular traits found");
        }

        return configs[0];
    }

    get modular(): { options: string[]; selected: string | null } {
        const weapon = this.parent;

        const configs = this.modularTraitConfigs;

        const sourceSelection = weapon._source.system.traits.toggles?.modular?.selected;
        const selected = this.#resolveChosenModularConfig(sourceSelection);
        const options = Object.keys(configs);

        return { options, selected };
    }

    /** Gets the selected modular configuration's data */
    get modularConfigData(): ModularConfig | null {
        return this.modular.selected ? this.modularTraitConfigs[this.modular.selected] : null;
    }

    /** Chooses a modular config based on selection, or default damage type if applicable */
    #resolveChosenModularConfig(selection: string | null | undefined): string | null {
        const configs = this.modularTraitConfigs;
        if (selection && configs[selection]) return selection;

        const defaultDamageType = this.parent.system.damage.damageType;
        for (const configKey in configs) {
            if (Object.prototype.hasOwnProperty.call(configs, configKey)) {
                const element = configs[configKey];
                if (element.damageType && element.damageType === defaultDamageType) return configKey;
            }
        }

        return null;
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
        // Filter out any versatile options that are the same as the weapon's base damage type
        return allOptions.filter((t) => weapon.system.damage.damageType !== t);
    }

    applyChanges(): void {
        const weapon = this.parent;

        if (this.modular.selected) {
            const traits = weapon.system.traits;
            traits.value = traits.value.concat(this.modularConfigData?.traits as typeof traits.value);
        }

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
            weapon.rule?.toggleTrait({ trait, selected });
        }

        return true;
    }
}

interface ToggleDoubleBarrelParams {
    trait: "double-barrel";
    selected: boolean;
}

interface ToggleVersatileParams {
    trait: "versatile";
    selected: DamageType | null;
}

interface ToggleModularParams {
    trait: "modular";
    selected: string;
}

type ToggleWeaponTraitParams = ToggleDoubleBarrelParams | ToggleVersatileParams | ToggleModularParams;

export { WeaponTraitToggles };
