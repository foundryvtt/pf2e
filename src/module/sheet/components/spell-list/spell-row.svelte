<script lang="ts">
    import { htmlClosest } from "@util";
    import type { Snippet } from "svelte";
    import InlineIconButton from "../inline-icon-button.svelte";
    import { reportControlsWidth } from "../controls-width.ts";
    import ListRow from "../list/list-row.svelte";
    import type { RowControl } from "../row-controls.ts";
    import PrepareControl from "./prepare-control.svelte";
    import type { SpellListActions, SpellListColumn, SpellRowData } from "./types.ts";

    interface SpellRowProps {
        spell: SpellRowData;
        columns: SpellListColumn[];
        actions: SpellListActions;
        /** Whether the current user can edit (gates edit/delete buttons and row dragging) */
        editable: boolean;
        /** Extra controls appended to the row's control cell */
        extraControls?: Snippet<[SpellRowData]>;
    }

    const { spell, columns, actions, editable, extraControls }: SpellRowProps = $props();

    // Report this row's control-cell width so the list can size the shared controls column
    const reportWidth = reportControlsWidth();
    const LOOK = { striped: true };

    function onDragStart(event: DragEvent): void {
        event.dataTransfer?.setData("text/plain", JSON.stringify({ type: "Item", uuid: spell.uuid }));
    }

    /** The focused row is about to disappear, so move focus to a neighbor row or the group label */
    async function deleteSpell(trigger: HTMLElement): Promise<void> {
        const row = htmlClosest(trigger, "li.spell-row");
        const neighbor = [row?.nextElementSibling, row?.previousElementSibling].find((el) =>
            el?.matches("li.spell-row"),
        );
        const fallback = htmlClosest(row, "section")?.querySelector("button.group-label");
        await actions.delete?.(spell.id);
        const target = neighbor?.querySelector("[data-row-name]") ?? fallback;
        if (target && fu.isElementInstanceOf(target, HTMLElement)) target.focus();
    }

    // Edit and delete for the row menu. The cell renders its own buttons around the prepare control.
    const controls = $derived.by((): RowControl[] => {
        const list: RowControl[] = [];
        const edit = actions.edit;
        if (editable && edit) {
            list.push({ icon: "fa-solid fa-edit", label: "PF2E.EditItemTitle", onClick: () => edit(spell.id) });
        }
        if (editable && actions.delete) {
            list.push({
                icon: "fa-solid fa-trash",
                label: "PF2E.DeleteItemTitle",
                onClick: (_event, trigger) => deleteSpell(trigger),
            });
        }
        return list;
    });
</script>

<ListRow
    id={spell.id}
    look={LOOK}
    uuid={spell.uuid}
    name={spell.name}
    img={spell.img}
    toChat={(event) => actions.sendToChat(spell.id, event)}
    {controls}
    summary={{ version: spell.updatedAt }}
    drag={editable ? { start: onDragStart } : null}
    class="spell-row"
    liProps={{ "data-cast-rank": spell.castRank }}
>
    {#snippet qualifiers()}
        {#if spell.glyph}<span class="action-glyph" aria-hidden="true">{spell.glyph}</span>{/if}
    {/snippet}
    {#snippet cells()}
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
    {/snippet}
    {#snippet controlsCell()}
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
                    onclick={(event) => deleteSpell(event.currentTarget)}
                />
            {/if}
            {@render extraControls?.(spell)}
        </div>
    {/snippet}
</ListRow>

<style>
    /* The li and row are ListRow's, so the spell list's look is keyed by this row's class */
    :global(li.spell-row) {
        --list-row-padding-block: var(--space-4);
        --list-row-padding-inline: var(--space-8);

        :global(.row-image) {
            aspect-ratio: 1;
            border-radius: 2px;
            box-shadow:
                0 0 0 1px var(--tertiary),
                0 0 0 2px #9f725b,
                inset 0 0 0.25rem rgba(0, 0, 0, 0.5);
            height: auto;
            min-height: 0;
        }

        :global(.row-image img),
        :global(.row-image i) {
            border-radius: 2px;
        }

        :global(.name-button) {
            align-items: center;
            font: 500 var(--font-size-14) / 1 var(--body-serif);
            letter-spacing: -0.025em;
        }
    }

    .action-glyph {
        font-size: 0.9em;
        /* Opt out of the .flat hover text-shadow, which distorts the glyph */
        text-shadow: none;
    }

    .defense,
    .range,
    .uses {
        justify-self: center;
        text-align: center;
    }

    .item-controls {
        /* Compact inline-control buttons to match the dense rows */
        --pf2e-inline-button-size: var(--spacer-20);

        align-items: center;
        display: flex;
        gap: var(--space-2);
        justify-self: end;

        input[type="checkbox"] {
            /* Core's checkbox background is nearly the same color as table rows in dark theme */
            --checkbox-background-color: light-dark(var(--color-dark-6), var(--table-row-color-highlight));

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

    /* Drop columns in narrow containers: range below 24rem, defense below 19rem. The templates switch on the group
       (spell-list.svelte), and the breakpoints assume the column widths defined there. */
    @container spell-list (width < 24rem) {
        .range {
            display: none;
        }
    }

    @container spell-list (width < 19rem) {
        .defense {
            display: none;
        }
    }
</style>
