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
    // An id for the browser's form field check. `form=""` keeps it out of a host form, so a read-only sheet
    // leaves it usable
    const uid = $props.id();
</script>

<div class="search">
    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
    <input
        type="search"
        id="{uid}-search"
        spellcheck="false"
        bind:value={search.query}
        placeholder={label}
        aria-label={label}
        form=""
    />
</div>
<p class="search-results" role="status">
    {#if search.active}
        {resultsLabel}
    {/if}
</p>

<style>
    .search {
        align-items: center;
        display: flex;
        gap: var(--space-8);

        > i {
            color: var(--color-text-secondary, inherit);
        }

        > input {
            flex: 1;
            min-width: 0;
        }
    }

    .search-results {
        color: var(--color-text-secondary, inherit);
        font-size: var(--font-size-12);
        margin: 0;
        min-height: 0;
    }
</style>
