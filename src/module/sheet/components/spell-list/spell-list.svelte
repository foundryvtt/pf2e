<script lang="ts">
    import * as R from "remeda";
    import type { Snippet } from "svelte";
    import { provideControlsWidths } from "./controls-width.ts";
    import GroupHeader from "./group-header.svelte";
    import SpellRow from "./spell-row.svelte";
    import type {
        SpellListActions,
        SpellListColumn,
        SpellListGroupData,
        SpellListSortColumn,
        SpellListSortState,
        SpellRowData,
    } from "./types.ts";

    interface SpellListProps {
        groups: SpellListGroupData[];
        /** Which middle columns to display, in order */
        columns: SpellListColumn[];
        actions: SpellListActions;
        /** Whether the current user can edit (gates edit/delete buttons and row dragging) */
        editable: boolean;
        /** Extra controls appended to each row's control cell */
        extraControls?: Snippet<[SpellRowData]>;
    }

    const { groups, columns, actions, editable, extraControls }: SpellListProps = $props();
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

    // Arrow keys walk the row names across all groups, as a faster alternative to Tab
    const nameNav = (event: KeyboardEvent & { currentTarget: HTMLElement }): void => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        if (!(event.target instanceof HTMLButtonElement) || !event.target.classList.contains("name")) return;
        event.preventDefault();
        const names = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button.name"));
        names[names.indexOf(event.target) + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
    };

    // View-only sort within each group, cycled per column: ascending, descending, back to manual order.
    // While active, reorder drops are suspended, since an insertion point means nothing in a sorted view.
    let sortBy = $state<SpellListSortState | null>(null);
    const cycleSort = (column: SpellListSortColumn): void => {
        sortBy =
            sortBy?.column !== column
                ? { column, direction: "ascending" }
                : sortBy.direction === "ascending"
                  ? { column, direction: "descending" }
                  : null;
    };
    // Numeric collation so "30 feet" sorts before "120 feet"
    const collator = new Intl.Collator(game.i18n.lang, { numeric: true, sensitivity: "base" });
    const sortedGroups = $derived.by(() => {
        const sort = sortBy;
        if (!sort) return groups;
        const value = (s: SpellRowData): string =>
            sort.column === "name" ? s.name : sort.column === "defense" ? (s.defense ?? "") : (s.range ?? "");
        const direction = sort.direction === "ascending" ? 1 : -1;
        return groups.map((g) => ({
            ...g,
            spells: [...g.spells].sort((a, b) => {
                // Prepared counts compare numerically, and slotless rows sort last
                if (sort.column === "prepared") {
                    const [ca, cb] = [a.slots?.preparedCount, b.slots?.preparedCount];
                    if (ca === undefined || cb === undefined)
                        return Number(ca === undefined) - Number(cb === undefined);
                    return direction * (ca - cb);
                }
                const [va, vb] = [value(a), value(b)];
                // Rows without a value in the column sort last in either direction
                if (!va || !vb) return Number(!va) - Number(!vb);
                // Unit-less ranges (touch) sort before measured ones
                if (sort.column === "range") {
                    const [ma, mb] = [/^\d/.test(va), /^\d/.test(vb)];
                    if (ma !== mb) return direction * (Number(ma) - Number(mb));
                }
                return direction * collator.compare(va, vb);
            }),
        }));
    });
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
    onkeydown={nameNav}
    style:--spell-row-columns={template(columns)}
    style:--spell-row-columns-sm={template(sm)}
    style:--spell-row-columns-xs={template(xs)}
    style:min-width={minWidth}
>
    {#each sortedGroups as group (group.rank)}
        <section class="spell-list-group" aria-labelledby="{uid}-group-{group.rank}">
            <GroupHeader
                {group}
                {columns}
                {actions}
                {editable}
                sort={sortBy}
                onSort={cycleSort}
                labelId="{uid}-group-{group.rank}"
            />
            <ol class="spell-list">
                {#each group.spells as spell (spell.id)}
                    <SpellRow {spell} {columns} {actions} {editable} reorderable={sortBy === null} {extraControls} />
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
