import type { ArmorCategory, ArmorGroup } from "@item/armor/types.ts";
import type { ResistanceType } from "@actor/types.ts";

interface ArmorSpecializationEntry {
    type: ResistanceType | ResistanceType[];
    value: number;
}

type ArmorSpecializationTable = Partial<Record<ArmorCategory, ArmorSpecializationEntry>>;

/** Standard armor specialization effects by group and category (Player Core / Starfinder Player Core). */
const armorSpecialization: Partial<Record<ArmorGroup, ArmorSpecializationTable>> = {
    chain: {
        medium: { type: "critical-hits", value: 4 },
        heavy: { type: "critical-hits", value: 6 },
    },
    composite: {
        medium: { type: "piercing", value: 1 },
        heavy: { type: "piercing", value: 2 },
    },
    leather: {
        medium: { type: "bludgeoning", value: 1 },
        heavy: { type: "bludgeoning", value: 2 },
    },
    plate: {
        medium: { type: "slashing", value: 1 },
        heavy: { type: "slashing", value: 2 },
    },
    skeletal: {
        medium: { type: "precision", value: 3 },
        heavy: { type: "precision", value: 5 },
    },
    ...(SYSTEM_ID === "sf2e"
        ? {
              ceramic: {
                  medium: {
                      type: ["acid", "cold", "electricity", "fire"],
                      value: 1,
                  },
                  heavy: {
                      type: ["acid", "cold", "electricity", "fire"],
                      value: 2,
                  },
              },
              polymer: {
                  medium: { type: "area-damage", value: 1 },
                  heavy: { type: "area-damage", value: 2 },
              },
          }
        : {}),
};

export { armorSpecialization };
export type { ArmorSpecializationEntry, ArmorSpecializationTable };
