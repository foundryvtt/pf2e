import * as R from "remeda";
import { KingdomAbility, KingdomCHG } from "./data.ts";

/** Resolves boosts using kingmaker rules. Free boosts cannot be the granted ability nor the flaw */
export function resolveKingdomBoosts(entry: KingdomCHG, choices: KingdomAbility[]): KingdomAbility[] {
    const notFreeBoosts = entry.boosts.filter((b): b is KingdomAbility => b !== "free");
    return R.uniq([notFreeBoosts, choices].flat())
        .filter((b) => b !== entry.flaw)
        .slice(0, entry.boosts.length);
}

/** A less verbose version of R.map */
export function mapValuesFromKeys<K extends string | number | symbol, V>(
    keys: readonly K[],
    mapping: (key: K) => V
): Record<K, V> {
    return R.mapToObj(keys, (key) => [key, mapping(key)]);
}
