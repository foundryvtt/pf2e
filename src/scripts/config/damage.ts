import { DamageCategoryUnique, DamageType } from "@system/damage/types.ts";
import { DAMAGE_TYPES } from "@system/damage/values.ts";
import * as R from "remeda";
import { alignmentTraits, energyDamageTypes, preciousMaterials } from "./traits.ts";

const damageCategoriesUnique: Record<DamageCategoryUnique, string> = {
    persistent: "PF2E.ConditionTypePersistentShort",
    precision: "PF2E.Damage.Precision",
    splash: "PF2E.TraitSplash",
};

const materialDamageEffects = R.pick(preciousMaterials, [
    "abysium",
    "adamantine",
    "cold-iron",
    "darkwood",
    "djezet",
    "inubrix",
    "keep-stone",
    "mithral",
    "noqual",
    "orichalcum",
    "peachwood",
    "siccatite",
    "silver",
    "sisterstone-dusk",
    "sisterstone-scarlet",
    "sovereign-steel",
    "warpglass",
]);

const damageCategories = {
    ...damageCategoriesUnique,
    ...materialDamageEffects,
    alignment: "PF2E.Alignment",
    energy: "PF2E.TraitEnergy",
    physical: "PF2E.TraitPhysical",
};

const physicalDamageTypes = {
    bleed: "PF2E.TraitBleed",
    bludgeoning: "PF2E.TraitBludgeoning",
    piercing: "PF2E.TraitPiercing",
    slashing: "PF2E.TraitSlashing",
};

const damageTypes: Record<DamageType, string> = {
    ...alignmentTraits,
    ...energyDamageTypes,
    ...physicalDamageTypes,
    mental: "PF2E.TraitMental",
    poison: "PF2E.TraitPoison",
    spirit: "PF2E.TraitSpirit",
    untyped: "PF2E.TraitUntyped",
};

const damageRollFlavors = [...DAMAGE_TYPES].reduce(
    (result, key) => {
        result[key] = `PF2E.Damage.RollFlavor.${key}`;
        return result;
    },
    {} as Record<DamageType, string>,
);

export {
    damageCategories,
    damageCategoriesUnique,
    damageRollFlavors,
    damageTypes,
    materialDamageEffects,
    physicalDamageTypes,
};
