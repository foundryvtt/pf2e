<script lang="ts">
    import type { Snippet } from "svelte";
    import type { SheetTabData } from "../../v2/base.svelte.ts";
    import SheetTabs from "./sheet-tabs.svelte";

    interface TabGroupProps {
        tabs: SheetTabData[];
        active: string;
        onSelect: (id: string) => void;
        /** Prefix for the tab and panel element ids, unique per window and group */
        idPrefix: string;
        /** Localized accessible name for the tab list */
        label: string;
        showTitle?: boolean;
        /** Off for a group nested in an already padded panel */
        padded?: boolean;
        /** Buttons after the tabs */
        controls?: Snippet;
        /** The active tab's content */
        children: Snippet;
    }

    const {
        tabs,
        active,
        onSelect,
        idPrefix,
        label,
        showTitle,
        padded = true,
        controls,
        children,
    }: TabGroupProps = $props();
</script>

<div class="tab-group">
    <SheetTabs {tabs} {active} {onSelect} {idPrefix} {label} {showTitle} {controls} />
    <!-- data-keyboard-focus: core treats a focused non-form element as unfocused and takes Tab for cycleView -->
    <div
        class="tab-panel"
        class:padded
        id="{idPrefix}-panel"
        role="tabpanel"
        aria-labelledby="{idPrefix}-tab-{active}"
        tabindex="0"
        data-keyboard-focus
    >
        {@render children()}
    </div>
</div>

<style>
    .tab-group {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
    }

    .tab-panel {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        /* Room for focus rings at the edges, which the scroll box would clip. The content stays aligned. */
        margin-inline: calc(-1 * var(--spacer-4));
        padding-inline: var(--spacer-4);

        &.padded {
            padding-block-start: var(--spacer-8);
        }
    }
</style>
