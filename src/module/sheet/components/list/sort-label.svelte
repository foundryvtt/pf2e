<script lang="ts" generics="TColumn extends string">
    import type { Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";
    import type { ListSort } from "./sort.svelte.ts";

    interface SortLabelProps extends Omit<HTMLButtonAttributes, "children" | "onclick"> {
        sort: ListSort<TColumn>;
        column: TColumn;
        children: Snippet;
    }

    const { sort, column, children, class: className, ...rest }: SortLabelProps = $props();
    const direction = $derived(sort.directionOf(column));
</script>

<button
    {...rest}
    type="button"
    class={["sort-label", "flat", className]}
    aria-pressed={direction !== null}
    onclick={() => sort.cycle(column)}
>
    {@render children()}
    {#if direction}
        <i class="fa-solid {direction === 'ascending' ? 'fa-caret-up' : 'fa-caret-down'}" aria-hidden="true"></i>
        <!-- aria-pressed doesn't change between ascending and descending, so the direction is read out -->
        <span class="sr-only">
            {_loc(direction === "ascending" ? "PF2E.List.SortAscending" : "PF2E.List.SortDescending")}
        </span>
    {:else}
        <i class="fa-solid fa-sort sortable-hint" aria-hidden="true"></i>
    {/if}
</button>

<style>
    /* Keeps the header's type. Less end padding, since the glyph has its own whitespace */
    .sort-label {
        align-items: center;
        display: inline-flex;
        font: inherit;
        gap: var(--space-2);
        height: auto;
        min-height: 0;
        padding: 0;
        padding-inline: var(--space-4) var(--space-1);

        /* A faded glyph marks a sortable but unsorted column */
        .sortable-hint {
            opacity: 0.4;
        }
    }
</style>
