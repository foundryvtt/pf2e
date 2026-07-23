<script lang="ts">
    import { htmlClosest } from "@util";
    import type { Snippet } from "svelte";
    import HoverIconButton from "../hover-icon-button.svelte";
    import InlineIconButton from "../inline-icon-button.svelte";
    import ItemSummary from "../item-summary.svelte";
    import { reportControlsWidth } from "./controls-width.ts";
    import PrepareControl from "./prepare-control.svelte";
    import type { SpellListActions, SpellListColumn, SpellRowData } from "./types.ts";

    interface SpellRowProps {
        spell: SpellRowData;
        columns: SpellListColumn[];
        actions: SpellListActions;
        /** Whether the current user can edit (gates edit/delete buttons and row dragging) */
        editable: boolean;
        /** Whether rows accept insertion drops (suspended while a column sort is active) */
        reorderable?: boolean;
        /** Extra controls appended to the row's control cell */
        extraControls?: Snippet<[SpellRowData]>;
    }

    const { spell, columns, actions, editable, reorderable = true, extraControls }: SpellRowProps = $props();
    const uid = $props.id();

    // Report this row's control-cell width so the list can size the shared controls column
    const reportWidth = reportControlsWidth();
    let open = $state(false);
    let dragging = $state(false);
    let dropEdge = $state<"above" | "below" | null>(null);
    const isDropTarget = $derived(!!actions.handleDrop && reorderable);
</script>

<!-- Row drag events don't propagate, so the list root's drop ring only shows over non-row space -->
<li
    class="spell-row"
    class:drag-gap={dragging}
    class:drop-above={dropEdge === "above"}
    class:drop-below={dropEdge === "below"}
    data-item-id={spell.id}
    draggable={editable ? true : undefined}
    ondragstart={editable
        ? (event) => {
              event.dataTransfer?.setData("text/plain", JSON.stringify({ type: "Item", uuid: spell.uuid }));
              // Dimming immediately would also dim the drag image
              setTimeout(() => (dragging = true));
          }
        : undefined}
    ondragend={editable ? () => (dragging = false) : undefined}
    ondrop={isDropTarget
        ? (event) => {
              event.stopPropagation();
              const before = dropEdge !== "below";
              dropEdge = null;
              actions.handleDrop?.(event, { id: spell.id, before });
          }
        : undefined}
    ondragover={isDropTarget
        ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              dropEdge = event.clientY < rect.top + rect.height / 2 ? "above" : "below";
          }
        : undefined}
    ondragenter={isDropTarget ? (event) => event.stopPropagation() : undefined}
    ondragleave={isDropTarget
        ? (event) => {
              event.stopPropagation();
              if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                  dropEdge = null;
              }
          }
        : undefined}
>
    <div class="item-name">
        <HoverIconButton
            class="item-image"
            src={spell.img}
            icon="fa-solid fa-message"
            data-tooltip="PF2E.NPC.SendToChat"
            aria-label={_loc("PF2E.NPC.SendToChat")}
            onclick={(event) => actions.sendToChat(spell.id, event)}
        />
        <!-- data-keyboard-focus keeps core from panning the canvas on the list's arrow-key navigation -->
        <button
            type="button"
            class="name flat"
            aria-expanded={open}
            aria-controls="{uid}-summary"
            data-keyboard-focus="true"
            onclick={() => (open = !open)}
        >
            <span>{spell.name}</span>
            {#if spell.glyph}<span class="action-glyph" aria-hidden="true">{spell.glyph}</span>{/if}
        </button>
    </div>
    {#each columns as column (column)}
        {#if column === "defense"}
            <div class="defense">{spell.defense ?? ""}</div>
        {:else if column === "range"}
            <div class="range">{spell.range ?? ""}</div>
        {:else}
            <!-- TODO: uses data is not yet modeled, so an empty cell keeps the grid aligned -->
            <div class="uses"></div>
        {/if}
    {/each}
    <div class="item-controls" {@attach reportWidth}>
        <PrepareControl {spell} {actions} />
        {#if actions.toggleSignature && !spell.isCantrip}
            <input
                type="checkbox"
                checked={spell.signature}
                disabled={spell.signatureDisabled}
                data-tooltip={spell.signature ? "PF2E.SpellCollectionRemove" : "PF2E.SpellCollectionAdd"}
                aria-label={_loc(spell.signature ? "PF2E.SpellCollectionRemove" : "PF2E.SpellCollectionAdd")}
                onchange={() => actions.toggleSignature?.(spell.id)}
            />
        {/if}
        {#if editable && actions.edit}
            <InlineIconButton
                icon="fa-solid fa-edit"
                data-tooltip="PF2E.EditItemTitle"
                aria-label={_loc("PF2E.EditItemTitle")}
                onclick={() => actions.edit?.(spell.id)}
            />
        {/if}
        {#if editable && actions.delete}
            <InlineIconButton
                icon="fa-solid fa-trash"
                data-tooltip="PF2E.DeleteItemTitle"
                aria-label={_loc("PF2E.DeleteItemTitle")}
                onclick={async (event) => {
                    // The focused row is about to disappear, so move focus to a neighbor row or the group label
                    const row = htmlClosest(event.currentTarget, "li.spell-row");
                    const neighbor = [row?.nextElementSibling, row?.previousElementSibling].find((el) =>
                        el?.matches("li.spell-row"),
                    );
                    const fallback = htmlClosest(row, "section")?.querySelector("button.group-label");
                    await actions.delete?.(spell.id);
                    const target = neighbor?.querySelector("button.name") ?? fallback;
                    if (target instanceof HTMLElement) target.focus();
                }}
            />
        {/if}
        {@render extraControls?.(spell)}
    </div>
    <ItemSummary id="{uid}-summary" uuid={spell.uuid} version={spell.updatedAt} {open} />
</li>

<style>
    li.spell-row {
        /* Core's light-theme highlight is near-black, so substitute a subtle tint (dark keeps core's color) */
        --table-row-color-highlight: light-dark(rgba(0, 0, 0, 0.1), var(--color-cool-3));

        align-items: center;
        display: grid;
        gap: var(--space-4);
        grid-template-columns: var(--spell-row-columns, 1fr);
        margin: 0;
        padding-block: var(--space-4);
        padding-inline: var(--space-8);
        /* Anchor for the drop-insertion indicator */
        position: relative;

        &:nth-child(odd) {
            background-color: var(--table-row-color-odd, transparent);
        }

        &:nth-child(even) {
            background-color: var(--table-row-color-even, transparent);
        }

        &:has(:global(:focus-visible)) {
            background-color: var(--table-row-color-highlight);
        }

        /* Dim the row being dragged. Chrome doesn't repaint until the drag is underway, so hiding
           the row would visibly linger while a late fade doesn't. */
        &.drag-gap {
            opacity: 0.5;
        }

        &.drop-above::before,
        &.drop-below::before {
            background: var(--color-warm-2);
            content: "";
            height: var(--space-2);
            inset-inline: 0;
            position: absolute;
            z-index: 1;
        }

        &.drop-above::before {
            inset-block-start: calc(-1 * var(--space-1));
        }

        &.drop-below::before {
            inset-block-end: calc(-1 * var(--space-1));
        }

        > .item-name {
            align-items: center;
            display: flex;
            gap: var(--space-8);
            min-width: 0;

            > :global(.item-image) {
                --image-size: 1.5rem;

                aspect-ratio: 1;
                border-radius: 2px;
                box-shadow:
                    0 0 0 1px var(--tertiary),
                    0 0 0 2px #9f725b,
                    inset 0 0 0.25rem rgba(0, 0, 0, 0.5);
                flex: 0 0 var(--image-size);
                height: auto;
                min-height: 0;
            }

            > :global(.item-image img),
            > :global(.item-image i) {
                border-radius: 2px;
            }

            > .name {
                align-items: center;
                display: flex;
                flex: 1;
                font: 500 var(--font-size-14) / 1 var(--body-serif);
                letter-spacing: -0.025em;
                min-height: 0;
                min-width: 0;

                .action-glyph {
                    font-size: 0.9em;
                    /* Opt out of the .flat hover text-shadow, which distorts the glyph */
                    text-shadow: none;
                }
            }
        }

        > .defense,
        > .range,
        > .uses {
            justify-self: center;
            text-align: center;
        }

        > .item-controls {
            /* Compact inline-control buttons to match the dense rows */
            --pf2e-inline-button-size: 1.25rem;

            align-items: center;
            display: flex;
            gap: var(--space-2);
            justify-self: end;

            :global(input[type="checkbox"]) {
                /* Core's checkbox background is nearly the same color as table rows in dark theme */
                --checkbox-background-color: var(--table-row-color-highlight);

                /* Core draws the box as a ::before glyph on an unstyled input, leaving the visible
                   box off-center: size the input to the glyph and center it. */
                display: grid;
                height: var(--checkbox-size);
                margin: 0;
                place-content: center;
                width: var(--checkbox-size);

                /* The highlight override above also beats core's disabled color: dim instead,
                   matching the prepare button's unavailable state */
                &:disabled {
                    opacity: 0.4;
                }
            }
        }

        > :global(.item-summary) {
            grid-column: 1 / -1;
        }
    }

    /* Drop columns in narrow containers: range below 24rem, defense below 19rem. Breakpoints assume the
       rem column widths defined in spell-list.svelte. */
    @container spell-list (width < 24rem) {
        li.spell-row {
            grid-template-columns: var(--spell-row-columns-sm, var(--spell-row-columns, 1fr));

            > .range {
                display: none;
            }
        }
    }

    @container spell-list (width < 19rem) {
        li.spell-row {
            grid-template-columns: var(--spell-row-columns-xs, var(--spell-row-columns, 1fr));

            > .defense {
                display: none;
            }
        }
    }
</style>
