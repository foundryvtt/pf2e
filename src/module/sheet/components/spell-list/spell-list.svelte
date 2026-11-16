<script lang="ts">
    import * as R from "remeda";
    import type { Snippet } from "svelte";
    import { provideControlsWidths } from "../controls-width.ts";
    import { gapToSibling } from "../list/drop-hit.ts";
    import { ListDrop, provideListDrop } from "../list/drop.svelte.ts";
    import { rowNameNav } from "../list/row-nav.ts";
    import { compareSortValues, ListSort } from "../list/sort.svelte.ts";
    import GroupHeader from "./group-header.svelte";
    import SpellRow from "./spell-row.svelte";
    import type {
        SpellListActions,
        SpellListColumn,
        SpellListGroupData,
        SpellListSortColumn,
        SpellRowData,
    } from "./types.ts";

    interface SpellListProps {
        groups: SpellListGroupData[];
        /** Which middle columns to display, in order */
        columns: SpellListColumn[];
        actions: SpellListActions;
        /** Whether the current user can edit (gates edit/delete buttons and row dragging) */
        editable: boolean;
        /** Rows can be reordered by drag. False while the groups are filtered, which hides rows' true neighbors. */
        reorderable?: boolean;
        /** Extra controls appended to each row's control cell */
        extraControls?: Snippet<[SpellRowData]>;
    }

    const { groups, columns, actions, editable, reorderable = true, extraControls }: SpellListProps = $props();
    const uid = $props.id();

    const columnWidths: Record<SpellListColumn, number> = { defense: 6, range: 4, uses: 4 };
    const nameWidth = 8;

    // Rows and headers report their control-cell widths, and the shared controls track sizes to the
    // widest. The max-content bound covers not-yet-measured cells, +1px guards sub-pixel rounding.
    const controlsWidths = provideControlsWidths();
    const controlsWidth = $derived(Math.max(0, ...controlsWidths.values()) + 1);

    const template = (cols: SpellListColumn[]): string =>
        [
            `minmax(${nameWidth}rem, 1fr)`,
            ...cols.map((c) => `${columnWidths[c]}rem`),
            `minmax(max-content, ${controlsWidth}px)`,
        ].join(" ");
    // Column sets for the -sm/-xs container breakpoints in spell-row/group-header
    const sm = $derived(columns.filter((c) => c !== "range"));
    const xs = $derived(columns.filter((c) => c !== "range" && c !== "defense"));

    // View-only sort within each group. While active, reorder drops are suspended, since an insertion point
    // means nothing in a sorted view.
    const sort = new ListSort<SpellListSortColumn>();
    const sortValue = (s: SpellRowData, column: SpellListSortColumn): string | number | null =>
        column === "prepared"
            ? (s.slots?.preparedCount ?? null)
            : column === "name"
              ? s.name
              : column === "defense"
                ? s.defense
                : s.range;
    const sortedGroups = $derived.by(() => {
        const state = sort.state;
        if (!state) return groups;
        const { column, direction } = state;
        return groups.map((g) => ({
            ...g,
            spells: [...g.spells].sort((a, b) => {
                const [va, vb] = [sortValue(a, column), sortValue(b, column)];
                // Unit-less ranges (touch) sort before measured ones
                if (column === "range" && va && vb) {
                    const [ma, mb] = [/^\d/.test(String(va)), /^\d/.test(String(vb))];
                    if (ma !== mb) return (direction === "ascending" ? 1 : -1) * (Number(ma) - Number(mb));
                }
                return compareSortValues(va, vb, direction);
            }),
        }));
    });
    // One drop target for the whole list. Without a place for the drop (sorted, filtered, off the rows), it is left
    // for whatever drop target the list sits in.
    const drop = new ListDrop(() => {
        const handleDrop = actions.handleDrop;
        const ids = new Map(sortedGroups.flatMap((g) => g.spells.map((s) => [s.uuid as string, s.id])));
        return {
            lists: sortedGroups.map((g) => ({
                id: String(g.rank),
                nodes: g.spells.map((s) => ({ key: s.uuid, children: null })),
            })),
            reorderable: reorderable && !sort.active,
            rowSelector: "li.spell-row",
            // A spell's rank is its own, so a listed spell only moves within its group
            allows: (hit, drag, index) => {
                if (hit.kind !== "gap") return false;
                if (!drag || !index.has(drag.key)) return true;
                return index.listOf(gapToSibling(hit.gap).key) === index.listOf(drag.key);
            },
            onDrop: handleDrop
                ? (event, hit) => {
                      if (hit.kind !== "gap") return;
                      const { key, before } = gapToSibling(hit.gap);
                      const id = ids.get(key);
                      if (id) handleDrop(event, { id, before });
                  }
                : undefined,
        };
    });
    provideListDrop(drop);

    // Content stops shrinking at the sum of the xs columns' minimums, and a too-small container clips or scrolls
    const minWidth = $derived.by(() => {
        const tracks = nameWidth + R.sumBy(xs, (c) => columnWidths[c]);
        return `calc(${tracks}rem + ${controlsWidth}px + ${xs.length + 1} * var(--space-4) + 2 * var(--space-8))`;
    });
</script>

<!-- The keydown handler only delegates for the row name buttons, so the wrapper stays presentational -->
<div
    class="spell-list-groups"
    role="presentation"
    onkeydown={rowNameNav}
    style:--spell-row-columns={template(columns)}
    style:--spell-row-columns-sm={template(sm)}
    style:--spell-row-columns-xs={template(xs)}
    style:min-width={minWidth}
    {@attach drop.zone}
>
    {#each sortedGroups as group (group.rank)}
        <section class="spell-list-group" aria-labelledby="{uid}-group-{group.rank}">
            <GroupHeader {group} {columns} {actions} {editable} {sort} labelId="{uid}-group-{group.rank}" />
            <ol class="spell-list">
                {#each group.spells as spell (spell.id)}
                    <SpellRow {spell} {columns} {actions} {editable} {extraControls} />
                {/each}
                {#if group.spells.length === 0}
                    <li class="empty">{_loc("PF2E.Actor.Creature.SpellPreparation.EmptyGroup")}</li>
                {/if}
            </ol>
        </section>
    {/each}
</div>

<style>
    .spell-list-groups {
        /* Queried by the container breakpoints in spell-row and group-header */
        container: spell-list / inline-size;
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
    }

    /* Header template and type for the shared ListHeader */
    .spell-list-group {
        --list-columns: var(--spell-row-columns);
        --list-header-font-family: var(--sans-serif);
        --list-header-font-weight: 500;
        --list-header-line-height: 1.75;
        --list-header-padding-block: var(--space-4);
        --list-header-padding-inline: var(--space-8);
    }

    @container spell-list (width < 24rem) {
        .spell-list-group {
            --list-columns: var(--spell-row-columns-sm, var(--spell-row-columns, 1fr));
        }
    }

    @container spell-list (width < 19rem) {
        .spell-list-group {
            --list-columns: var(--spell-row-columns-xs, var(--spell-row-columns, 1fr));
        }
    }

    /* Undo core's ul/ol margin, padding, and markers */
    .spell-list {
        list-style: none;
        margin: 0;
        padding: 0;

        .empty {
            color: var(--color-text-secondary, inherit);
            font-style: italic;
            padding-block: var(--space-4);
            padding-inline: var(--space-8);
        }
    }
</style>
