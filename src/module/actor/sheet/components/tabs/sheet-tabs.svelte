<script lang="ts">
    import type { Snippet } from "svelte";
    import type { SheetTabData } from "../../v2/base.svelte.ts";

    interface SheetTabsProps {
        tabs: SheetTabData[];
        active: string;
        onSelect: (id: string) => void;
        /** Prefix for the tab and panel element ids */
        idPrefix: string;
        /** Localized accessible name for the tab list */
        label: string;
        /** Show the active tab's name beside the tabs */
        showTitle?: boolean;
        /** Buttons after the tabs, e.g. a manage-tabs menu */
        controls?: Snippet;
    }

    const { tabs, active, onSelect, idPrefix, label, showTitle = true, controls }: SheetTabsProps = $props();

    // Selected right away on click. The active prop catches up after the sheet re-renders.
    let current = $derived(active);
    const title = $derived(tabs.find((t) => t.id === current)?.label ?? "");

    const select = (id: string): void => {
        current = id;
        onSelect(id);
    };

    // Left/Right step and Home/End jump between tabs. Tab moves on to the panel.
    const onkeydown = (event: KeyboardEvent & { currentTarget: HTMLElement }): void => {
        const index = tabs.findIndex((t) => t.id === current);
        const target = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: tabs.length - 1,
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        const next = tabs[(target + tabs.length) % tabs.length];
        select(next.id);
        event.currentTarget.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus();
    };
</script>

<div class="sheet-tabs">
    {#if showTitle}
        <span class="panel-title" aria-hidden="true">{_loc(title)}</span>
    {/if}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div class="tabs" role="tablist" aria-label={label} {onkeydown}>
        {#each tabs as tab (tab.id)}
            {@const selected = tab.id === current}
            <button
                type="button"
                class="flat"
                role="tab"
                id="{idPrefix}-tab-{tab.id}"
                data-tab={tab.id}
                aria-selected={selected}
                aria-controls="{idPrefix}-panel"
                aria-label={_loc(tab.label)}
                tabindex={selected ? 0 : -1}
                data-tooltip={tab.label}
                data-tooltip-direction="UP"
                onclick={() => select(tab.id)}
            >
                {#if tab.glyph}
                    <span class="action-glyph" aria-hidden="true">{tab.glyph}</span>
                {:else if tab.icon}
                    <i class={tab.icon} aria-hidden="true"></i>
                {/if}
            </button>
        {/each}
    </div>
    {@render controls?.()}
</div>

<style>
    .sheet-tabs {
        display: flex;
        align-items: center;
        gap: var(--space-8);
        border-block-end: 1px solid var(--color-tabs-border);
    }

    .panel-title {
        flex: 1;
        font-family: var(--serif);
        font-size: var(--font-size-18);
        font-weight: 600;
    }

    .tabs {
        display: flex;
        gap: var(--space-2);
    }

    /* .tabs outranks the system's button.flat reset */
    .tabs button {
        display: grid;
        place-items: center;
        width: var(--spacer-32);
        height: var(--spacer-28);
        min-height: 0;
        font-size: var(--font-size-16);
        /* Square bottom corners keep the selected underline straight */
        border-radius: 4px 4px 0 0;
        color: var(--color-text-secondary);
        /* Core animates every property, which delays the selected underline */
        transition-property: color, background-color;

        .action-glyph {
            font-size: var(--font-size-18);
        }

        &:hover,
        &:focus-visible {
            color: var(--color-text-primary);
            background: var(--table-row-color-highlight);
        }

        &[aria-selected="true"] {
            color: var(--color-text-primary);
            box-shadow: inset 0 -2px 0 var(--color-pf-primary);
        }
    }
</style>
