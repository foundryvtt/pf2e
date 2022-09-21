import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { extractModifierAdjustments } from "@module/rules/util";
import { AttackItem } from "./creature/types";
import { ModifierPF2e, MODIFIER_TYPE } from "./modifiers";

/** Find the lowest multiple attack penalty for an attack with a given item */
function calculateMAPs(
    item: ItemPF2e,
    { domains, options }: { domains: string[]; options: Set<string> | string[] }
): MAPData {
    const optionSet = options instanceof Set ? options : new Set(options);
    const baseMap = calculateBaseMAP(item);
    const maps = item.actor?.synthetics.multipleAttackPenalties ?? {};
    const fromSynthetics = domains
        .flatMap((d) => maps[d] ?? [])
        .filter((p) => p.predicate?.test(optionSet) ?? true)
        .map((p): MAPData => ({ label: p.label, map1: p.penalty, map2: p.penalty * 2 }));

    // Find lowest multiple attack penalty: penalties are negative, so actually looking for the highest value
    return [baseMap, ...fromSynthetics].reduce((lowest, p) => (p.map1 > lowest.map1 ? p : lowest));
}

function calculateBaseMAP(item: ItemPF2e): MAPData {
    if (item.isOfType("melee", "weapon")) {
        // calculate multiple attack penalty tiers
        const alternateMAP = item.isOfType("weapon") ? item.system.MAP.value : null;
        switch (alternateMAP) {
            case "1":
                return { label: "PF2E.MultipleAttackPenalty", map1: -1, map2: -2 };
            case "2":
                return { label: "PF2E.MultipleAttackPenalty", map1: -2, map2: -4 };
            case "3":
                return { label: "PF2E.MultipleAttackPenalty", map1: -3, map2: -6 };
            case "4":
                return { label: "PF2E.MultipleAttackPenalty", map1: -4, map2: -8 };
            case "5":
                return { label: "PF2E.MultipleAttackPenalty", map1: -5, map2: -10 };
            default: {
                return item.traits.has("agile")
                    ? { label: "PF2E.MultipleAttackPenalty", map1: -4, map2: -8 }
                    : { label: "PF2E.MultipleAttackPenalty", map1: -5, map2: -10 };
            }
        }
    }
    return { label: "PF2E.MultipleAttackPenalty", map1: -5, map2: -10 };
}

/** Get the range increment of a target for a given weapon */
function getRangeIncrement(attackItem: AttackItem, distance: number | null): number | null {
    if (attackItem.isOfType("spell")) return null;

    return attackItem.rangeIncrement && typeof distance === "number"
        ? Math.max(Math.ceil(distance / attackItem.rangeIncrement), 1)
        : null;
}

/** Determine range penalty for a ranged attack roll */
function calculateRangePenalty(
    actor: ActorPF2e,
    increment: number | null,
    selectors: string[],
    rollOptions: Set<string>
): ModifierPF2e | null {
    if (!increment || increment === 1) return null;
    const slug = "range-penalty";
    const modifier = new ModifierPF2e({
        label: "PF2E.RangePenalty",
        slug,
        type: MODIFIER_TYPE.UNTYPED,
        modifier: Math.max((increment - 1) * -2, -12), // Max range penalty before automatic failure
        predicate: { not: ["ignore-range-penalty", { gte: ["ignore-range-penalty", increment] }] },
        adjustments: extractModifierAdjustments(actor.synthetics.modifierAdjustments, selectors, slug),
    });
    modifier.test(rollOptions);
    return modifier;
}

interface MAPData {
    label: string;
    map1: number;
    map2: number;
}

export { calculateMAPs, calculateRangePenalty, getRangeIncrement };
