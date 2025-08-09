import { DamageType } from "@system/damage/index.ts";
import { damageTypes } from "./damage.ts";
import { WeaponTrait } from "@item/weapon/types.ts";

interface ModularConfig {
    label: string;
    damageType?: DamageType;
    traits: WeaponTrait[];
}

const modularConfigs: Record<string, Record<string, ModularConfig>> = {
    modular: {
        bludgeoning: {
            label: damageTypes.bludgeoning,
            damageType: "bludgeoning",
            traits: [],
        },
        piercing: {
            label: damageTypes.piercing,
            damageType: "piercing",
            traits: [],
        },
        slashing: {
            label: damageTypes.slashing,
            damageType: "slashing",
            traits: [],
        },
    },
    "modular-p-grapple-s-sweep": {
        "p-and-grapple": {
            label: "PF2E.Item.Weapon.ModularConfigs.PAndGrapple",
            damageType: "piercing",
            traits: ["grapple"],
        },
        "s-and-sweep": {
            label: "PF2E.Item.Weapon.ModularConfigs.SAndSweep",
            damageType: "slashing",
            traits: ["sweep"],
        },
    },
};

export { modularConfigs };
export type { ModularConfig };
