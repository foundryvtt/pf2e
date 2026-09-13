import { TextSearch } from "../text-search.svelte.ts";
import type { SpellListGroupData } from "./types.ts";

/** The indexed representation of one spell: `traits` is a space-joined list for term matching */
interface SpellSearchDoc {
    id: string;
    name: string;
    traits: string;
}

/**
 * Search state for spell lists. One instance can back several lists by filtering each group set
 * with the same query.
 */
class SpellListSearch extends TextSearch<SpellSearchDoc> {
    constructor() {
        super({ fields: ["name", "traits"] });
    }

    /** Hide non-matching spells and drop emptied groups */
    filter(groups: SpellListGroupData[]): SpellListGroupData[] {
        const matches = this.matches;
        if (!matches) return groups;
        return groups
            .map((g) => ({ ...g, spells: g.spells.filter((s) => matches.has(s.id)) }))
            .filter((g) => g.spells.length > 0);
    }
}

export { SpellListSearch };
export type { SpellSearchDoc };
