import * as R from "remeda";
import { KingdomAbility, KingdomCHG } from "./types.ts";

/** Resolves boosts using kingmaker rules. Free boosts cannot be the granted ability nor the flaw */
export function resolveKingdomBoosts(entry: KingdomCHG, choices: KingdomAbility[]): KingdomAbility[] {
    const notFreeBoosts = entry.boosts.filter((b): b is KingdomAbility => b !== "free");
    const flaw = "flaw" in entry ? entry.flaw : null;
    return R.uniq([notFreeBoosts, choices].flat())
        .filter((b) => b !== flaw)
        .slice(0, entry.boosts.length);
}
