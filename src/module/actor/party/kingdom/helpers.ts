import * as R from "remeda";
import { KingdomAbility, KingdomCHG, KingdomCommodity } from "./types.ts";
import type { Kingdom } from "./model.ts";

/** Resolves boosts using kingmaker rules. Free boosts cannot be the granted ability nor the flaw */
export function resolveKingdomBoosts(entry: KingdomCHG, choices: KingdomAbility[]): KingdomAbility[] {
    const notFreeBoosts = entry.boosts.filter((b): b is KingdomAbility => b !== "free");
    return R.uniq([notFreeBoosts, choices].flat())
        .filter((b) => b !== entry.flaw)
        .slice(0, entry.boosts.length);
}

/** Assemble what will be collected during the kingdom's upkeep phase */
export function calculateKingdomCollectionData(kingdom: Kingdom): {
    formula: string;
    commodities: Record<Exclude<KingdomCommodity, "food">, number>;
} {
    const commodityTypes = ["luxuries", "lumber", "ore", "stone"] as const;
    return {
        formula: `${kingdom.resources.dice.number}d${kingdom.resources.dice.faces}`,
        commodities: R.mapToObj(commodityTypes, (type) => {
            const value = kingdom.resources.workSites[type];
            return [type, value.value + value.resource * 2];
        }),
    };
}
