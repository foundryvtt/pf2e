<script lang="ts">
    import InlineIconButton from "../inline-icon-button.svelte";
    import { reportControlsWidth } from "../controls-width.ts";
    import ListHeader from "../list/list-header.svelte";
    import SortLabel from "../list/sort-label.svelte";
    import type { ListSort } from "../list/sort.svelte.ts";
    import type { SpellListActions, SpellListColumn, SpellListGroupData, SpellListSortColumn } from "./types.ts";

    interface GroupHeaderProps {
        group: SpellListGroupData;
        columns: SpellListColumn[];
        actions: SpellListActions;
        /** Whether the current user can edit (gates the create/browse buttons) */
        editable: boolean;
        /** The list's view-only column sort, shared by every group */
        sort: ListSort<SpellListSortColumn>;
        /** Id for the group label, referenced by the containing section's aria-labelledby */
        labelId: string;
    }

    const { group, columns, actions, editable, sort, labelId }: GroupHeaderProps = $props();

    // Report this header's control-cell width so the list can size the shared controls column
    const reportWidth = reportControlsWidth();

    const columnLabels: Record<SpellListColumn, string> = {
        defense: "PF2E.Item.Spell.Defense.Label",
        range: "PF2E.TraitRange",
        uses: "PF2E.SpellUsesLabel",
    };
</script>

<ListHeader class="group-header">
    <div class="label-cell">
        <!-- A heading so screen readers can jump between rank groups -->
        <h3>
            <SortLabel {sort} column="name" class="group-label" id={labelId}>{group.label}</SortLabel>
        </h3>
        {#if group.usage}
            <SortLabel
                {sort}
                column="prepared"
                class="usage"
                data-tooltip="PF2E.SpellPreparedLabel"
                aria-label="{_loc('PF2E.SpellPreparedLabel')} {group.usage.value}/{group.usage.max}"
            >
                {group.usage.value}/{group.usage.max}
            </SortLabel>
        {/if}
    </div>
    {#each columns as column (column)}
        <SortLabel {sort} {column} class="column-label {column}">{_loc(columnLabels[column])}</SortLabel>
    {/each}
    {#if editable && (actions.create || actions.browse)}
        <div class="item-controls" {@attach reportWidth}>
            {#if actions.create}
                <InlineIconButton
                    icon="fa-solid fa-plus"
                    data-tooltip="PF2E.CreateSpellTitle"
                    aria-label={_loc("PF2E.CreateSpellTitle")}
                    onclick={() => actions.create?.(group.rank)}
                />
            {/if}
            {#if actions.browse}
                <InlineIconButton
                    icon="fa-solid fa-magnifying-glass"
                    data-tooltip="PF2E.OpenSpellBrowserTitle"
                    aria-label={_loc("PF2E.OpenSpellBrowserTitle")}
                    onclick={() => actions.browse?.(group.rank)}
                />
            {/if}
        </div>
    {/if}
</ListHeader>

<style>
    .label-cell {
        align-items: baseline;
        display: flex;
        gap: var(--space-4);

        /* The heading is semantic only: no box, and no heading font inherited into the button */
        h3 {
            display: contents;
            font: inherit;
        }

        :global(.group-label) {
            font-weight: 700;
        }

        :global(.usage) {
            color: var(--color-text-secondary, inherit);
            font-weight: 400;
        }
    }

    .item-controls {
        /* Compact inline-control buttons to match the dense rows */
        --pf2e-inline-button-size: var(--spacer-20);

        display: flex;
        gap: var(--space-2);
        justify-self: end;
    }

    :global(.group-header > .column-label) {
        justify-self: center;
        text-align: center;
    }

    @container spell-list (width < 24rem) {
        :global(.group-header > .column-label.range) {
            display: none;
        }
    }

    @container spell-list (width < 19rem) {
        :global(.group-header > .column-label.defense) {
            display: none;
        }
    }
</style>
