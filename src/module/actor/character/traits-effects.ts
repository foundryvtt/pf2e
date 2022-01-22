import { CharacterPF2e } from "@actor";
import { StrikeTrait } from "@actor/data/base";
import { WeaponPF2e } from "@item";
import { WeaponTrait } from "@item/weapon/data";
import { ErrorPF2e, sluggify } from "@util";

export class TraitManager {
    static booleanToggleables = [
        /^nonlethal$/,
        /^two-hand-d(?:8|10|12)$/,
        /^thrown-\d+$/,
        /versatile-(?:b|p|s|fire|positive)$/,
    ];

    static isToggleable(trait: string): trait is WeaponTrait {
        return this.booleanToggleables.some((toggleable) => toggleable.test(trait));
    }

    /** Build a `StrikeTrait` from a reference weapon and stringy trait */
    static inflateTrait(weapon: Embedded<WeaponPF2e>, trait: WeaponTrait | "attack"): StrikeTrait {
        if (!(weapon.actor instanceof CharacterPF2e)) throw ErrorPF2e("Only a PC can use toggleable strike traits");

        // Inclusive of weapon traits
        const attackTraits: Record<string, string | undefined> = CONFIG.PF2E.npcAttackTraits;
        const actionTraits: Record<string, string | undefined> = CONFIG.PF2E.actionTraits;

        const inflated: StrikeTrait = {
            name: trait,
            label: game.i18n.localize(actionTraits[trait] ?? attackTraits[trait] ?? trait),
            description: CONFIG.PF2E.traitsDescriptions[trait] ?? null,
        };

        if (this.isToggleable(trait)) {
            const slug = weapon.slug ?? sluggify(weapon.name);
            const flagKey = `${weapon.id}_${slug}`;
            const flags = (weapon.actor.data.flags.pf2e.strikeTraits[flagKey] ??= {});
            inflated.toggleable = true;
            inflated.toggleState = flags[trait] ?? false;
        } else {
            inflated.toggleable = false;
        }

        return inflated;
    }

    static getToggleableTraits(weapon: Embedded<WeaponPF2e>): { [K in WeaponTrait]?: boolean } {
        if (!(weapon.actor instanceof CharacterPF2e)) throw ErrorPF2e("Only a PC can use toggleable strike traits");
        const slug = weapon.slug ?? sluggify(weapon.name);
        const flagKey = `${weapon.id}_${slug}`;
        return weapon.actor.data.flags.pf2e.strikeTraits[flagKey] ?? {};
    }
}
