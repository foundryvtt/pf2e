<script lang="ts">
    import SearchInput from "../search-input.svelte";
    import type { SpellListSearch } from "./search.svelte.ts";

    interface SpellSearchInputProps {
        search: SpellListSearch;
        /** Spells visible across the lists this search feeds */
        resultCount: number;
    }

    const { search, resultCount }: SpellSearchInputProps = $props();
</script>

<SearchInput
    {search}
    label={_loc("PF2E.SpellList.Search")}
    resultsLabel={_loc("PF2E.SpellList.SearchResults", { count: resultCount })}
/>
