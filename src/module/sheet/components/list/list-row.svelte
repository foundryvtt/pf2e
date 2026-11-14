<script lang="ts">
    import type { ItemUUID } from "@common/documents/_module.mjs";
    import type { ItemPF2e } from "@item";
    import type { Snippet } from "svelte";
    import type { ClassValue, HTMLAttributes } from "svelte/elements";
    import { useListDrop } from "./drop.svelte.ts";
    import { setActiveDrag } from "../../drag-source.ts";
    import HoverIconButton from "../hover-icon-button.svelte";
    import ItemSummary from "../item-summary.svelte";
    import RowControls from "../row-controls.svelte";
    import type { RowControl } from "../row-controls.ts";
    import RowMenu from "../row-menu.svelte";
    import { controlEntries, RowMenuState, type RowMenuEntry } from "../row-menu.svelte.ts";

    /** How a list presents its rows, the same for every row in it */
    interface ListRowLook {
        /** Alternating backgrounds, for table-like lists */
        striped?: boolean;
        /** An open summary runs the row's width under a divider ("flush", the default) or sits in a bordered box */
        summary?: "flush" | "card";
        /** Rows are subgrids of the list's grid, whose auto-sized columns line up, and ignore `--list-columns` */
        subgrid?: boolean;
        /** A plain list, with dividers between rows and no side padding */
        ruled?: boolean;
    }

    /**
     * One row of a sheet list. It provides the parts every list shares: the image (click to send to chat), the name
     * (click to open the summary), the control buttons and the right-click menu. Each list adds its own cells through
     * snippets and styles them itself.
     */
    interface ListRowProps {
        id: string;
        uuid: ItemUUID;
        name: string;
        img: string;
        /** Makes the image a Send to Chat button and adds the menu entry */
        toChat?: (event: MouseEvent) => void;
        controls: RowControl[];
        /** Menu entries between Send to Chat and the controls */
        menuEntries?: RowMenuEntry[];
        /** `version` refreshes an open summary. `item` is an in-memory item the uuid can't resolve to. */
        summary?: { version?: number; item?: ItemPF2e | null };
        /**
         * Makes the row draggable. `start` writes the drag data, and `type` is the item type, for lists that only take
         * some. The row is the drag source, not the li, which leaves links in an open summary with their own data.
         */
        drag?: { start: (event: DragEvent) => void; type?: string } | null;
        /** Nesting level, indenting the name by `--list-row-indent` (1rem) per level */
        depth?: number;
        look?: ListRowLook;
        /** Class on the name text. `rarity-<slug>` colors it by rarity. */
        nameClass?: string;
        class?: ClassValue;
        /** Extra attributes and handlers for the li and the row */
        liProps?: HTMLAttributes<HTMLLIElement>;
        rowProps?: HTMLAttributes<HTMLDivElement>;
        /** Between the image and the name */
        beforeName?: Snippet;
        /** After the name, inside its button */
        qualifiers?: Snippet;
        /** Under the name */
        details?: Snippet;
        /** After the name, in the name cell */
        afterName?: Snippet;
        /** The list's middle columns */
        cells?: Snippet;
        /** Replaces the default `RowControls` cell (e.g. with a prepare control). `controls` still feed the menu. */
        controlsCell?: Snippet;
        /** After the summary, e.g. nested rows */
        nested?: Snippet;
    }

    const {
        id,
        uuid,
        name,
        img,
        toChat,
        controls,
        menuEntries = [],
        summary = {},
        drag = null,
        depth = 0,
        look = {},
        nameClass,
        class: className,
        liProps,
        rowProps,
        beforeName,
        qualifiers,
        details,
        afterName,
        cells,
        controlsCell,
        nested,
    }: ListRowProps = $props();
    const uid = $props.id();

    let open = $state(false);
    let dragging = $state(false);
    // Not reactive: only read by the deferred dimming, which must skip a drag that already ended
    let dragActive = false;
    // A pending drop on this row, from the list's drop controller if it has one
    const listDrop = useListDrop();
    const dropMarker = $derived(listDrop?.markerFor(uuid) ?? null);

    /** Records the dragged row for the lists, since drag data can't be read while hovering */
    function onDragStart(event: DragEvent): void {
        setActiveDrag({ key: uuid, type: drag?.type ?? "" }, event.view ?? window);
        drag?.start(event);
        // The browser takes the drag image as this returns. The row only needs its backing until then.
        const row = event.currentTarget;
        if (row && fu.isElementInstanceOf(row, HTMLElement)) {
            row.classList.add("drag-image");
            setTimeout(() => row.classList.remove("drag-image"));
        }
        // Dimming immediately would also dim the drag image
        dragActive = true;
        setTimeout(() => (dragging = dragActive));
    }

    function onDragEnd(): void {
        dragActive = dragging = false;
    }
    const menu = new RowMenuState();
    // Worked out from the inputs. The entries are only built when the menu opens.
    const hasMenu = $derived(!!toChat || menuEntries.length > 0 || controls.length > 0);
    const entries = $derived<RowMenuEntry[]>([
        ...(toChat ? [{ id: "chat", label: _loc("PF2E.NPC.SendToChat"), run: toChat }] : []),
        ...menuEntries,
        ...controlEntries(controls),
    ]);
</script>

<li
    {...liProps}
    class={[
        "list-row",
        className,
        liProps?.class,
        dropMarker && `drop-${dropMarker}`,
        {
            striped: look.striped,
            "summary-card": look.summary === "card",
            subgrid: look.subgrid,
            ruled: look.ruled,
            dragging,
        },
    ]}
    style:--depth="calc({depth} * var(--list-row-indent, var(--spacer-16)))"
    data-item-id={id}
    data-uuid={uuid}
>
    <div
        {...rowProps}
        class={["row", rowProps?.class, { "menu-open": menu.open }]}
        role="presentation"
        draggable={drag ? true : undefined}
        ondragstart={drag ? onDragStart : undefined}
        ondragend={drag ? onDragEnd : undefined}
        {@attach hasMenu ? menu.row : undefined}
    >
        <div class="name">
            {#if toChat}
                <HoverIconButton
                    class="row-image"
                    src={img}
                    icon="fa-solid fa-message"
                    data-tooltip="PF2E.NPC.SendToChat"
                    aria-label="{_loc('PF2E.NPC.SendToChat')}: {name}"
                    onclick={toChat}
                />
            {:else}
                <img class="row-image" src={img} alt="" />
            {/if}
            {@render beforeName?.()}
            <div class="text">
                <button
                    type="button"
                    class="flat name-button"
                    data-row-name
                    data-keyboard-focus="true"
                    {@attach hasMenu ? menu.name : undefined}
                    aria-expanded={open}
                    aria-controls={open ? `${uid}-summary` : undefined}
                    onclick={() => (open = !open)}
                >
                    <span class={nameClass}>{name}</span>
                    {@render qualifiers?.()}
                </button>
                {@render details?.()}
            </div>
            {@render afterName?.()}
        </div>
        {@render cells?.()}
        {#if controlsCell}
            {@render controlsCell()}
        {:else}
            <RowControls {controls} subject={name} />
        {/if}
        {#if hasMenu}
            <RowMenu {menu} label={name} {entries} />
        {/if}
    </div>

    <ItemSummary id="{uid}-summary" {uuid} version={summary.version} item={summary.item} {open} />
    {@render nested?.()}
</li>

<style>
    li.list-row {
        /* What lists tune through the --list-row-* properties, resolved once with the defaults */
        --_image-size: var(--list-row-image-size, var(--spacer-24));
        --_padding-block: var(--list-row-padding-block, 1px);
        --_padding-inline: var(--list-row-padding-inline, var(--space-4));
        position: relative;
        margin: 0;
        list-style: none;

        /* Off-screen rows skip style and layout. That also clips painting to the row, so nothing may overflow it.
           Not on subgrid rows, which containment would cut off from the list's grid. An unrendered row is assumed
           to be one line tall: its image plus its padding, which is why that padding needs a unit even at 0. */
        &:not(.subgrid) {
            content-visibility: auto;
            contain-intrinsic-size: auto calc(var(--_image-size) + 2 * var(--_padding-block));
        }

        &.subgrid {
            display: grid;
            grid-template-columns: subgrid;
            grid-column: 1 / -1;

            > :global(*) {
                grid-column: 1 / -1;
            }
        }

        /* The row being dragged. Chrome doesn't repaint until the drag is underway, so hiding it would visibly
           linger while a late fade doesn't. */
        &.dragging {
            opacity: 0.5;
        }

        /* A plain list: dividers between rows instead of stripes, and no box to keep clear of */
        &.ruled {
            --list-row-padding-inline: 0px;

            /* Global: the row before is another instance */
            :global(li.ruled) + & {
                border-block-start: 1px solid alpha(from var(--color-border) / calc(alpha * 0.6));
            }
        }

        /* Zero specificity for the condition, so the focus highlight below still wins on striped rows */
        &:where(.striped:nth-child(even)) > .row {
            --row-tint: var(--table-row-color-even, transparent);
            background-color: var(--row-tint);
        }

        /* A row with keyboard focus inside it, or with its menu open. The menu is inside the row, so without the
           class only keyboard users would see the row lit. Fields are left out: they always count as focus-visible,
           clicks included, and show their own focus. */
        > .row:has(:global(:focus-visible:not(input, select, textarea))),
        > .row.menu-open {
            background-color: var(--table-row-color-highlight);
        }

        /* A row's own background is see-through or a faint stripe, which leaves a dragged row's text floating over
           whatever is under the pointer. The window background (a color in dark, an image in light) backs it, under
           the row's stripe if it has one. */
        > .row:global(.drag-image) {
            background: linear-gradient(var(--row-tint, transparent) 0 0), var(--background);
        }

        /* An open summary runs the row's width under a divider, indented with the row's nesting */
        > :global(.item-summary) {
            margin-inline-start: var(--depth);
            border-block: 1px solid var(--table-header-border-color);
            padding: var(--space-8);
            background: var(--table-background-color);
        }

        /* Lists without stripes box the summary so it reads as the row's: a card set a little below the row, with
           more room before the next row */
        &.summary-card > :global(.item-summary) {
            margin: var(--space-4) var(--_padding-inline) var(--space-8) calc(var(--_padding-inline) + var(--depth));
            border: 1px solid var(--table-header-border-color);
            border-radius: 4px;
        }

        /* The list parts where a dragged row would land. The gap is the li's own padding, so the pointer stays
           over the same li and the target doesn't flip as the rows move. */
        --drop-gap: calc(var(--_image-size) + 2 * var(--_padding-block));
        transition: padding-block 0.12s ease;

        &.drop-before {
            padding-block-start: var(--drop-gap);
        }

        &.drop-end {
            padding-block-end: var(--drop-gap);
        }

        &.drop-before::before,
        &.drop-end::after {
            content: "";
            position: absolute;
            inset-inline: var(--depth) 0;
            block-size: var(--drop-gap);
            border: 1px dashed var(--color-warm-2);
            border-radius: 2px;
            background: alpha(from var(--color-warm-2) / 0.15);
            pointer-events: none;
            z-index: 1;
        }

        &.drop-before::before {
            inset-block-start: 0;
        }

        &.drop-end::after {
            inset-block-end: 0;
        }

        /* The row spans the list's width, so the outline is its own box starting at the row's nesting */
        &.drop-into > .row::after {
            content: "";
            position: absolute;
            inset: 0;
            inset-inline-start: var(--depth);
            box-shadow: inset 0 0 0 2px var(--color-warm-2);
            pointer-events: none;
        }
    }

    /* A change of nesting level at one boundary swaps the gap between rows in place, with no easing (see ListDrop) */
    :global([data-drop-snap]) li.list-row {
        transition: none;
    }

    /* Every row uses the list's template, so columns line up without measuring */
    .row {
        position: relative;
        display: grid;
        grid-template-columns: var(--list-columns, minmax(0, 1fr) auto);
        align-items: center;
        gap: var(--space-4);
        padding-block: var(--_padding-block);
        padding-inline: var(--_padding-inline);
        /* A list can move the start edge alone, to sit its images against a frame */
        padding-inline-start: var(--list-row-padding-inline-start, var(--_padding-inline));

        .subgrid > & {
            grid-template-columns: subgrid;
            column-gap: normal;
        }
    }

    .name {
        display: flex;
        align-items: center;
        gap: var(--space-8);
        min-width: 0;
        padding-inline-start: var(--depth);

        :global(.row-image) {
            --image-size: var(--_image-size);
            flex-shrink: 0;
        }

        /* A plain image when the row can't be sent to chat, sized like the button */
        img.row-image {
            width: var(--image-size);
            height: var(--image-size);
            border: none;
            object-fit: cover;
        }
    }

    /* Fills the cell, so the whole name area opens the summary */
    .text {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-width: 0;
    }

    /* Sized by its text rather than core's button height, so rows stay compact. Long names wrap rather than
       truncate: baseline keeps the qualifiers on the name's line, align-content centers that line in the button. */
    .name-button {
        height: auto;
        min-height: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        align-content: center;
        gap: 0 var(--space-4);
        min-width: 0;
        padding-block: var(--space-2);
        padding-inline: 0;
        text-align: start;

        > span:first-child {
            overflow-wrap: anywhere;
        }

        > :global(.rarity-uncommon) {
            --rarity-color: var(--color-rarity-uncommon);
        }

        > :global(.rarity-rare) {
            --rarity-color: var(--color-rarity-rare);
        }

        > :global(.rarity-unique) {
            --rarity-color: var(--color-rarity-unique);
        }

        /* Normal rarity colors are too dark to read on dark mode */
        > :global(:is(.rarity-uncommon, .rarity-rare, .rarity-unique)) {
            color: light-dark(var(--rarity-color), oklch(from var(--rarity-color) 0.78 c h));
        }
    }
</style>
