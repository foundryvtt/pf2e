<script lang="ts">
    import type { SearchState } from "./text-search.svelte.ts";

    interface SearchInputProps {
        search: SearchState;
        /** Localized input placeholder and aria-label */
        label: string;
        /** Localized result summary, announced while a search is active */
        resultsLabel: string;
    }

    const { search, label, resultsLabel }: SearchInputProps = $props();
</script>

<div class="search">
    <input type="search" spellcheck="false" bind:value={search.query} placeholder={label} aria-label={label} />
</div>
<p class="search-results" role="status">
    {#if search.active}
        {resultsLabel}
    {/if}
</p>

<style>
    .search-results {
        color: var(--color-text-secondary, inherit);
        font-size: var(--font-size-12);
        margin: 0;
        min-height: 0;
    }
</style>
