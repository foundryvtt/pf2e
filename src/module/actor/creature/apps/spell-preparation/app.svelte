<script lang="ts">
    import SearchInput from "@module/sheet/components/spell-list/search-input.svelte";
    import SpellList from "@module/sheet/components/spell-list/spell-list.svelte";
    import type { SvelteAppProps } from "@module/sheet/mixin.svelte.ts";
    import type { SpellPreparationContext } from "./app.ts";

    const { search, actions, getState }: SpellPreparationContext & SvelteAppProps<SpellPreparationContext> = $props();
    const data = $derived(getState());
    let dropDepth = $state(0);

    const filteredGroups = $derived(search.filter(data.groups));
    const resultCount = $derived(filteredGroups.reduce((n, g) => n + g.spells.length, 0));

    const listActions = $derived({
        ...actions,
        toggleSignature: data.isFlexible ? actions.toggleSignature : undefined,
    });
</script>

<header class="sheet-header">
    <h1>
        {data.name}
        {#if data.flexibleAvailable}
            <span class="flexible-available">
                {_loc("PF2E.SpellFlexibleAvailable", {
                    value: data.flexibleAvailable.value,
                    max: data.flexibleAvailable.max,
                })}
            </span>
        {/if}
    </h1>
    <p class="hint">{data.hint}</p>
    <SearchInput {search} {resultCount} />
</header>

<section
    class="content"
    class:drop-highlight={!!actions.handleDrop && dropDepth > 0}
    aria-label={data.name}
    data-tooltip-class="pf2e"
    ondrop={(event) => {
        dropDepth = 0;
        actions.handleDrop?.(event, null);
    }}
    ondragover={(event) => event.preventDefault()}
    ondragenter={() => (dropDepth += 1)}
    ondragleave={() => (dropDepth -= 1)}
>
    <SpellList groups={filteredGroups} columns={["defense", "range"]} actions={listActions} editable={data.editable} />
</section>

<style>
    .sheet-header {
        flex-direction: column;
        gap: var(--space-4);
        margin: var(--space-8);
        margin-block-end: 0;

        h1 {
            align-items: baseline;
            border: none;
            column-gap: var(--space-8);
            display: flex;
            flex-wrap: wrap;
            font-size: var(--font-size-28);
            justify-content: space-between;
            margin: 0;
            margin-block-end: var(--space-2);

            .flexible-available {
                font-weight: normal;
                white-space: nowrap;
            }
        }

        > :global(.search) {
            margin-block-start: var(--space-2);
        }
    }

    .content {
        display: flex;
        flex: 1;
        flex-direction: column;
        /* Keep the scroll offset when rows reorder (sorting) or filter: scroll anchoring
           would follow a moved row and visibly jump */
        overflow-anchor: none;
        overflow-y: auto;
        padding-block: 0 var(--space-8);
        padding-inline: var(--space-8);
        scrollbar-gutter: stable;

        /* Valid drop target, ringed like core's drop targets */
        &.drop-highlight {
            box-shadow: inset 0 0 0 2px var(--color-warm-2);
        }
    }
</style>
