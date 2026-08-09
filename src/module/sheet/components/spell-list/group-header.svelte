<script lang="ts">
    import InlineIconButton from "../inline-icon-button.svelte";
    import { reportControlsWidth } from "./controls-width.ts";
    import type {
        SpellListActions,
        SpellListColumn,
        SpellListGroupData,
        SpellListSortColumn,
        SpellListSortState,
    } from "./types.ts";

    interface GroupHeaderProps {
        group: SpellListGroupData;
        columns: SpellListColumn[];
        actions: SpellListActions;
        /** Whether the current user can edit (gates the create/browse buttons) */
        editable: boolean;
        /** The list's active column sort, indicated on the corresponding header label */
        sort: SpellListSortState | null;
        /** Cycle the sort for a column (clicking a header label) */
        onSort: (column: SpellListSortColumn) => void;
        /** Id for the group label, referenced by the containing section's aria-labelledby */
        labelId: string;
    }

    const { group, columns, actions, editable, sort, onSort, labelId }: GroupHeaderProps = $props();

    // Report this header's control-cell width so the list can size the shared controls column
    const reportWidth = reportControlsWidth();

    const columnLabels: Record<SpellListColumn, string> = {
        defense: "PF2E.Item.Spell.Defense.Label",
        range: "PF2E.TraitRange",
        uses: "PF2E.SpellUsesLabel",
    };
</script>

{#snippet sortIcon(column: SpellListSortColumn)}
    {#if sort?.column === column}
        <i class="fa-solid {sort.direction === 'ascending' ? 'fa-caret-up' : 'fa-caret-down'}" aria-hidden="true"></i>
        <!-- aria-pressed alone is silent on the ascending -> descending press: name the direction -->
        <span class="sr-only">
            {_loc(sort.direction === "ascending" ? "PF2E.SpellList.SortAscending" : "PF2E.SpellList.SortDescending")}
        </span>
    {:else}
        <i class="fa-solid fa-sort sortable-hint" aria-hidden="true"></i>
    {/if}
{/snippet}

<header class="group-header">
    <div class="label-cell">
        <!-- A heading so screen readers can jump between rank groups -->
        <h3>
            <button
                type="button"
                class="group-label flat"
                id={labelId}
                aria-pressed={sort?.column === "name"}
                onclick={() => onSort("name")}
            >
                {group.label}
                {@render sortIcon("name")}
            </button>
        </h3>
        {#if group.usage}
            <button
                type="button"
                class="usage flat"
                data-tooltip="PF2E.SpellPreparedLabel"
                aria-pressed={sort?.column === "prepared"}
                aria-label="{_loc('PF2E.SpellPreparedLabel')} {group.usage.value}/{group.usage.max}"
                onclick={() => onSort("prepared")}
            >
                {group.usage.value}/{group.usage.max}
                {@render sortIcon("prepared")}
            </button>
        {/if}
    </div>
    {#each columns as column (column)}
        <button
            type="button"
            class="column-label flat {column}"
            aria-pressed={sort?.column === column}
            onclick={() => onSort(column)}
        >
            {_loc(columnLabels[column])}
            {@render sortIcon(column)}
        </button>
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
</header>

<style>
    .group-header {
        align-items: center;
        /* Back the sticky header with the window background (a color in dark theme, an image in light),
           then tint it with the possibly translucent header color so scrolling rows don't show through. */
        background: var(--background);
        border-block-end: 1px solid var(--table-header-border-color);
        box-shadow: inset 0 0 0 100vmax var(--table-header-bg-color);
        display: grid;
        font: 500 var(--font-size-12) var(--sans-serif);
        gap: var(--space-4);
        grid-template-columns: var(--spell-row-columns);
        inset-block-start: 0;
        line-height: 1.75;
        padding-block: var(--space-4);
        padding-inline: var(--space-8);
        position: sticky;
        z-index: 1;

        .label-cell {
            align-items: baseline;
            display: flex;
            gap: var(--space-4);

            /* The heading is semantic only: no box, and no heading font inherited into the button */
            h3 {
                display: contents;
                font: inherit;
            }
        }

        /* Header labels are sort buttons: undo button sizing and keep the header typography.
           Inline padding is lighter at the end, where the sort glyph carries its own whitespace. */
        .group-label,
        .column-label,
        .usage {
            align-items: center;
            display: inline-flex;
            font: inherit;
            gap: var(--space-2);
            height: auto;
            min-height: 0;
            padding: 0;
            padding-inline: var(--space-4) var(--space-1);

            /* A faded sort glyph marks unsorted-but-sortable columns */
            .sortable-hint {
                opacity: 0.4;
            }
        }

        .group-label {
            font-weight: 700;
        }

        .usage {
            color: var(--color-text-secondary, inherit);
            font-weight: 400;
        }

        .column-label {
            justify-self: center;
            text-align: center;
        }

        .item-controls {
            /* Compact inline-control buttons to match the dense rows */
            --pf2e-inline-button-size: 1.25rem;

            display: flex;
            gap: var(--space-2);
            justify-self: end;
        }
    }

    @container spell-list (width < 24rem) {
        .group-header {
            grid-template-columns: var(--spell-row-columns-sm, var(--spell-row-columns, 1fr));

            > .column-label.range {
                display: none;
            }
        }
    }

    @container spell-list (width < 19rem) {
        .group-header {
            grid-template-columns: var(--spell-row-columns-xs, var(--spell-row-columns, 1fr));

            > .column-label.defense {
                display: none;
            }
        }
    }
</style>
