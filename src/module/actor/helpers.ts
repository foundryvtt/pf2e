import { ItemPF2e } from "@item";

function calculateMAP(item: ItemPF2e): { label: string; map2: number; map3: number } {
    if (item.isOfType("melee", "weapon")) {
        // calculate multiple attack penalty tiers
        const alternateMAP = item.isOfType("weapon") ? item.data.data.MAP.value : null;
        switch (alternateMAP) {
            case "1":
                return { label: "PF2E.MultipleAttackPenalty", map2: -1, map3: -2 };
            case "2":
                return { label: "PF2E.MultipleAttackPenalty", map2: -2, map3: -4 };
            case "3":
                return { label: "PF2E.MultipleAttackPenalty", map2: -3, map3: -6 };
            case "4":
                return { label: "PF2E.MultipleAttackPenalty", map2: -4, map3: -8 };
            case "5":
                return { label: "PF2E.MultipleAttackPenalty", map2: -5, map3: -10 };
            default: {
                return item.traits.has("agile")
                    ? { label: "PF2E.MultipleAttackPenalty", map2: -4, map3: -8 }
                    : { label: "PF2E.MultipleAttackPenalty", map2: -5, map3: -10 };
            }
        }
    }
    return { label: "PF2E.MultipleAttackPenalty", map2: -5, map3: -10 };
}

export { calculateMAP };
