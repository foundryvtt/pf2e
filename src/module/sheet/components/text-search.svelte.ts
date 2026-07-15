import MiniSearch from "minisearch";

interface SearchableDoc {
    id: string;
}

/**
 * The surface a search UI needs: `search-input.svelte` binds against this rather than `TextSearch`
 * itself so it stays independent of the document type parameter.
 */
interface SearchState {
    query: string;
    readonly active: boolean;
}

/**
 * Reactive text-search state over a set of documents: owns the query and the index, and exposes the
 * matching ids. Pair with `search-input.svelte` for the UI. Domain layers (e.g. the spell list's
 * `SpellListSearch`) extend this with their document fields and result filtering.
 */
class TextSearch<TDoc extends SearchableDoc> implements SearchState {
    query = $state("");

    /** Bumped on reindex so match sets recompute against the new documents */
    #version = $state(0);

    #engine: MiniSearch<TDoc>;

    /** Ids matching the current query, or null when the query is too short to search on */
    #matches: Set<string> | null = $derived.by(() => {
        void this.#version;
        return this.active ? new Set(this.#engine.search(this.query).map((r) => String(r.id))) : null;
    });

    constructor({ fields }: { fields: (keyof TDoc & string)[] }) {
        const segmenter = new Intl.Segmenter(game.i18n.lang, { granularity: "word" });
        this.#engine = new MiniSearch({
            fields,
            idField: "id",
            processTerm: (term): string[] | null => {
                if (term.length < 2 || CONFIG.i18n.searchStopWords.has(term)) return null;
                return Array.from(segmenter.segment(term))
                    .map((t) =>
                        fa.ux.SearchFilter.cleanQuery(t.segment.toLocaleLowerCase(game.i18n.lang)).replace(/['"]/g, ""),
                    )
                    .filter((t) => t.length >= 2);
            },
            searchOptions: { combineWith: "AND", prefix: true },
        });
    }

    /** Search only starts once at least two characters are entered */
    get active(): boolean {
        return this.query.trim().length > 1;
    }

    get matches(): Set<string> | null {
        return this.#matches;
    }

    /** Replace the indexed documents (call whenever the searchable set changes) */
    index(docs: TDoc[]): void {
        this.#engine.removeAll();
        this.#engine.addAll(docs);
        this.#version += 1;
    }
}

export { TextSearch };
export type { SearchableDoc, SearchState };
