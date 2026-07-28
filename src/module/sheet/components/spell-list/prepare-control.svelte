<script lang="ts">
    import type { ZeroToTen } from "@module/data.ts";
    import PopoverMenu from "../popover-menu.svelte";
    import type { SpellListActions, SpellRowData } from "./types.ts";

    /**
     * Slot-preparation controls for a spell row, in the shape of the inventory quantity adjuster:
     * a remove button, the prepared count, and a prepare button, with a rank menu when several
     * ranks are eligible. Renders nothing when the spell does not prepare into slots, and only the
     * count when the prepare action is absent (e.g. for observers).
     */
    interface PrepareControlProps {
        spell: SpellRowData;
        actions: SpellListActions;
    }

    const { spell, actions }: PrepareControlProps = $props();

    let menuOpen = $state<"prepare" | "unprepare" | null>(null);
    let prepareEl: HTMLDivElement | null = $state(null);

    const closeMenu = (refocus: boolean): void => {
        const which = menuOpen;
        menuOpen = null;
        if (refocus) {
            prepareEl
                ?.querySelector<HTMLButtonElement>(which === "unprepare" ? "button.decrease" : "button.increase")
                ?.focus();
        }
    };

    const targets = $derived(spell.slots?.prepareTargets ?? []);
    const removals = $derived(actions.unprepare ? (spell.slots?.unprepareTargets ?? []) : []);
    const count = $derived(spell.slots?.preparedCount ?? 0);
    // The count's tooltip breaks the preparations down by rank
    const countTooltip = $derived.by(() => {
        const breakdown = spell.slots?.unprepareTargets ?? [];
        if (breakdown.length === 0) return _loc("PF2E.Actor.Creature.SpellPreparation.NotPrepared");
        const label = _loc("PF2E.SpellPreparedLabel");
        return `${label}: ${breakdown.map((t) => `${t.label} ×${t.count}`).join(", ")}`;
    });

    const menuItems = $derived(
        (menuOpen === "prepare" ? targets : removals).map((t) => ({ id: String(t.rank), label: t.label })),
    );
    const selectRank = (id: string): void => {
        const rank = Number(id) as ZeroToTen;
        (menuOpen === "prepare" ? actions.prepare : actions.unprepare)?.(spell.id, rank);
    };

    /** Act directly with one eligible rank, or open that button's rank menu */
    const onAdjust = (mode: "prepare" | "unprepare"): void => {
        // An open menu always closes from its own trigger, even with no choices left
        if (menuOpen === mode) {
            menuOpen = null;
            return;
        }
        const choices = mode === "prepare" ? targets : removals;
        if (choices.length === 0) return;
        game.tooltip.deactivate();
        if (choices.length === 1) {
            menuOpen = null;
            (mode === "prepare" ? actions.prepare : actions.unprepare)?.(spell.id, choices[0].rank);
        } else {
            menuOpen = mode;
        }
    };
</script>

{#if spell.slots}
    {@const plusLabel = _loc("PF2E.Actor.Creature.SpellPreparation.Prepare")}
    {@const minusLabel = _loc("PF2E.Actor.Creature.SpellPreparation.RemovePreparation")}
    {@const plusDisabledLabel = _loc(
        spell.isCantrip && count > 0
            ? "PF2E.Actor.Creature.SpellPreparation.CantripPrepared"
            : "PF2E.Actor.Creature.SpellPreparation.NoFreeSlots",
    )}
    <div class="prepare" bind:this={prepareEl}>
        {#if actions.prepare}
            <button
                type="button"
                class="decrease flat"
                class:unavailable={removals.length === 0}
                data-tooltip={menuOpen ? undefined : minusLabel}
                aria-label={minusLabel}
                aria-disabled={removals.length === 0 || undefined}
                aria-expanded={removals.length > 1 || menuOpen === "unprepare" ? menuOpen === "unprepare" : undefined}
                aria-haspopup={removals.length > 1 || menuOpen === "unprepare" ? "menu" : undefined}
                style:anchor-name={menuOpen === "unprepare" ? "--pf2e-popover-menu" : undefined}
                onclick={() => onAdjust("unprepare")}
            >
                <i class="fa-solid fa-minus" aria-hidden="true"></i>
            </button>
        {/if}
        {#if spell.isCantrip}
            <!-- Cantrips prepare at most once, so show a check (or nothing) instead of a count -->
            {@const label = _loc(
                count > 0 ? "PF2E.SpellPreparedLabel" : "PF2E.Actor.Creature.SpellPreparation.NotPrepared",
            )}
            <span
                class="prepared-count"
                data-tooltip={count > 0 && !menuOpen ? label : undefined}
                role="img"
                aria-label={label}
            >
                {#if count > 0}<i class="fa-solid fa-check" aria-hidden="true"></i>{/if}
            </span>
        {:else}
            <span
                class="prepared-count"
                class:none={count === 0}
                data-tooltip={menuOpen ? undefined : countTooltip}
                role="img"
                aria-label={count > 0
                    ? `${_loc("PF2E.SpellPreparedLabel")} ×${count}`
                    : _loc("PF2E.Actor.Creature.SpellPreparation.NotPrepared")}
            >
                {count}
            </span>
        {/if}
        {#if actions.prepare}
            <button
                type="button"
                class="increase flat"
                class:unavailable={targets.length === 0}
                data-tooltip={menuOpen ? undefined : targets.length > 0 ? plusLabel : plusDisabledLabel}
                aria-label={targets.length > 0 ? plusLabel : plusDisabledLabel}
                aria-disabled={targets.length === 0 || undefined}
                aria-expanded={targets.length > 1 || menuOpen === "prepare" ? menuOpen === "prepare" : undefined}
                aria-haspopup={targets.length > 1 || menuOpen === "prepare" ? "menu" : undefined}
                style:anchor-name={menuOpen === "prepare" ? "--pf2e-popover-menu" : undefined}
                onclick={() => onAdjust("prepare")}
            >
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
            </button>
            {#if menuOpen !== null}
                <PopoverMenu
                    label={menuOpen === "prepare" ? plusLabel : minusLabel}
                    items={menuItems}
                    onSelect={selectRank}
                    onClose={closeMenu}
                    anchor={prepareEl}
                />
            {/if}
        {/if}
    </div>
{/if}

<style>
    /* The rank menu anchors to the button that opened it */
    .prepare {
        align-items: center;
        anchor-scope: --pf2e-popover-menu;
        display: flex;
        gap: var(--space-2);
        position: relative;

        button {
            font-size: var(--font-size-10);
            height: auto;
            min-height: 0;
            padding: var(--space-2);

            &.unavailable {
                --button-hover-background-color: transparent;

                cursor: default;
                opacity: 0.4;
            }
        }
    }

    .prepared-count {
        flex: none;
        font-size: var(--font-size-12);
        font-weight: 700;
        line-height: 1;
        text-align: center;
        width: 1.25em;

        &.none {
            color: var(--color-text-secondary, inherit);
            font-weight: 400;
        }

        i {
            color: var(--color-level-success);
        }
    }
</style>
