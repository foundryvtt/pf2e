import { WeaponTrait } from "@item/weapon/types.ts";
import { immunityTypes, resistanceTypes, weaknessTypes } from "@scripts/config/iwr.ts";
import { DamageType } from "@system/damage/types.ts";
import {
    BASE_DAMAGE_TYPES_TO_CATEGORIES,
    DAMAGE_TYPES,
    DAMAGE_TYPE_ICONS,
    ENERGY_DAMAGE_TYPES,
    PHYSICAL_DAMAGE_TYPES,
} from "@system/damage/values.ts";
import { sluggify, tupleHasValue } from "@util";
import { CustomDamageData } from "./data.ts";
import { HomebrewElements } from "./menu.ts";

/**
 * To update all custom damage types in the system, we need to ensure that all collections are added to and cleaned.
 * This reduces the scope of all damage related operations so that its easier to identify when something goes wrong.
 */
export class DamageTypeManager {
    // All collections that homebrew damage must be updated in
    collections = {
        physicalConfig: CONFIG.PF2E.physicalDamageTypes as Record<string, string>,
        energyConfig: CONFIG.PF2E.energyDamageTypes as Record<string, string>,
        physical: PHYSICAL_DAMAGE_TYPES as unknown as string[],
        energy: ENERGY_DAMAGE_TYPES as unknown as string[],
        DAMAGE_TYPES,
        BASE_DAMAGE_TYPES_TO_CATEGORIES,
        DAMAGE_TYPE_ICONS,
        damageTypesLocalization: CONFIG.PF2E.damageTypes,
        damageRollFlavorsLocalization: CONFIG.PF2E.damageRollFlavors,
        immunityTypes: immunityTypes as Record<string, string>,
        weaknessTypes: weaknessTypes as Record<string, string>,
        resistanceTypes: resistanceTypes as Record<string, string>,
    };

    addCustomDamage(data: CustomDamageData, options: { slug?: string } = {}): void {
        const collections = this.collections;
        const slug = (options.slug ?? sluggify(data.label)) as DamageType;
        collections.DAMAGE_TYPES.add(slug);
        if (tupleHasValue(["physical", "energy"], data.category)) {
            collections[data.category].push(slug);
            collections[`${data.category}Config`][slug] = data.label;
        }
        collections.BASE_DAMAGE_TYPES_TO_CATEGORIES[slug] = data.category ?? null;
        collections.DAMAGE_TYPE_ICONS[slug] = data.icon?.substring(3) ?? null; // icons registered do not include the fa-
        collections.damageTypesLocalization[slug] = data.label;

        const versatileLabel = game.i18n.format("PF2E.TraitVersatileX", { x: data.label });
        CONFIG.PF2E.weaponTraits[`versatile-${slug}` as WeaponTrait] = versatileLabel;
        CONFIG.PF2E.npcAttackTraits[`versatile-${slug}` as WeaponTrait] = versatileLabel;

        const damageFlavor = game.i18n.localize(data.label).toLocaleLowerCase(game.i18n.lang);
        collections.damageRollFlavorsLocalization[slug] = damageFlavor;
        collections.immunityTypes[slug] = damageFlavor;
        collections.weaknessTypes[slug] = damageFlavor;
        collections.resistanceTypes[slug] = damageFlavor;
    }

    updateSettings(): void {
        const reservedTerms = HomebrewElements.reservedTerms;

        // Delete all existing homebrew damage types first
        const typesToDelete: Set<string> = DAMAGE_TYPES.filter((t) => !reservedTerms.damageTypes.has(t));
        for (const collection of Object.values(this.collections)) {
            if (collection instanceof Set) {
                const types = [...collection].filter((t) => typesToDelete.has(t));
                for (const damageType of types) collection.delete(damageType);
            } else {
                const types = Object.keys(collection).filter((t): t is keyof typeof collection => typesToDelete.has(t));
                for (const damageType of types) delete collection[damageType];
            }
        }

        // Delete versatile damage traits
        for (const type of typesToDelete) {
            const weaponTraits: Record<string, string> = CONFIG.PF2E.weaponTraits;
            const npcAttackTraits: Record<string, string> = CONFIG.PF2E.npcAttackTraits;
            delete weaponTraits[`versatile-${type}`];
            delete npcAttackTraits[`versatile-${type}`];
        }

        // Add module damage types
        for (const [slug, data] of Object.entries(HomebrewElements.moduleData.damageTypes)) {
            if (!reservedTerms.damageTypes.has(slug)) {
                this.addCustomDamage(data, { slug });
            }
        }

        // Read setting damage types
        const customTypes = game.settings
            .get("pf2e", "homebrew.damageTypes")
            .filter((t) => !reservedTerms.damageTypes.has(sluggify(t.label)));
        for (const data of customTypes) {
            this.addCustomDamage(data);
        }
    }
}
