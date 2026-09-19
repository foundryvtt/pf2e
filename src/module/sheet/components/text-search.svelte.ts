import MiniSearch from "minisearch";

interface SearchableDoc {
    id: string;
}

/** What `search-input.svelte` binds to, so it doesn't care about the document type */
interface SearchState {
    query: string;
    readonly active: boolean;
}

/**
 * `terms`: word-prefix matching ranked by relevance, stop words dropped.
 * `substring`: one case-folded fragment anywhere in a field, document order, no stop words.
 */
type TextSearchMatcher = "terms" | "substring";

interface TextSearchOptions<TDoc extends SearchableDoc> {
    /** Document fields to match against */
    fields: (keyof TDoc & string)[];
    /** Matching strategy (default `terms`) */
    matcher?: TextSearchMatcher;
    /** Characters required before searching starts (default 2) */
    minLength?: number;
}

/**
 * Reactive search state over a set of documents. Pair with `search-input.svelte` for the UI and extend for
 * domain-specific filtering (see `SpellListSearch`).
 */
class TextSearch<TDoc extends SearchableDoc> implements SearchState {
    query = $state("");

    /** Bumped on reindex so the deriveds recompute */
    #version = $state(0);

    #fields: (keyof TDoc & string)[];

    #minLength: number;

    /** Null in substring mode, which needs no index */
    #engine: MiniSearch<TDoc> | null = null;

    /** Substring mode only */
    #docs: TDoc[] = [];

    /** Score by matching id, or null while the query is too short */
    #scores: Map<string, number> | null = $derived.by(() => {
        void this.#version;
        if (!this.active) return null;
        const engine = this.#engine;
        return engine
            ? new Map(engine.search(this.query).map((r) => [String(r.id), r.score]))
            : this.#substringScores();
    });

    #matches: Set<string> | null = $derived.by(() => (this.#scores ? new Set(this.#scores.keys()) : null));

    constructor({ fields, matcher = "terms", minLength = 2 }: TextSearchOptions<TDoc>) {
        this.#fields = fields;
        this.#minLength = minLength;
        if (matcher === "substring") return;

        const segmenter = new Intl.Segmenter(game.i18n.lang, { granularity: "word" });
        this.#engine = new MiniSearch({
            fields,
            idField: "id",
            processTerm: (term): string[] | null => {
                // Fold case first so "An" is dropped like "an"
                const folded = term.toLocaleLowerCase(game.i18n.lang);
                if (folded.length < 2 || CONFIG.i18n.searchStopWords.has(folded)) return null;
                return Array.from(segmenter.segment(folded))
                    .map((t) => fa.ux.SearchFilter.cleanQuery(t.segment).replace(/['"]/g, ""))
                    .filter((t) => t.length >= 2);
            },
            searchOptions: { combineWith: "AND", prefix: true },
        });
    }

    get active(): boolean {
        return this.query.trim().length >= this.#minLength;
    }

    get matches(): Set<string> | null {
        return this.#matches;
    }

    /** For sorting by relevance */
    get scores(): Map<string, number> | null {
        return this.#scores;
    }

    /** Substring mode keeps `docs` by reference and only recomputes here: pass a fresh array */
    index(docs: TDoc[]): void {
        if (this.#engine) {
            this.#engine.removeAll();
            this.#engine.addAll(docs);
        } else {
            this.#docs = docs;
        }
        this.#version += 1;
    }

    /** Every match scores 1, so relevance sorts fall back to document order */
    #substringScores(): Map<string, number> {
        const fragment = this.query.trim().toLocaleLowerCase(game.i18n.lang);
        const matches = this.#docs.filter((doc) =>
            this.#fields.some((field) => {
                const value = doc[field];
                return typeof value === "string" && value.toLocaleLowerCase(game.i18n.lang).includes(fragment);
            }),
        );
        return new Map(matches.map((doc) => [doc.id, 1]));
    }
}

export { TextSearch };
export type { SearchableDoc, SearchState, TextSearchMatcher, TextSearchOptions };
