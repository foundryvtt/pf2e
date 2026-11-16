<script lang="ts">
    import type { Snippet } from "svelte";

    interface ListHeaderProps {
        /** Pinned to the top of the scroll box while its section scrolls through */
        sticky?: boolean;
        class?: string;
        children: Snippet;
    }

    const { sticky = true, class: className, children }: ListHeaderProps = $props();
</script>

<!-- Columns come from `--list-columns` on an ancestor, so rows and header share one template -->
<header class={["list-header", className]} class:sticky>
    {@render children()}
</header>

<style>
    /* Lists tune spacing and type through the --list-header-* properties so headers line up with their rows */
    .list-header {
        align-items: center;
        border-block-end: 1px solid var(--table-header-border-color, var(--color-border));
        display: grid;
        font-family: var(--list-header-font-family, inherit);
        font-size: var(--font-size-12);
        font-weight: var(--list-header-font-weight, normal);
        gap: var(--space-4);
        grid-template-columns: var(--list-columns, 1fr);
        line-height: var(--list-header-line-height, normal);
        padding-block: var(--list-header-padding-block, var(--space-2));
        padding-inline: var(--list-header-padding-inline, var(--space-4));

        /* The header color may be see-through, which tints the window background (a color in dark, an image in
           light) and rows scrolling under it stay hidden */
        &.sticky {
            background: var(--background);
            box-shadow: inset 0 0 0 100vmax var(--table-header-bg-color, transparent);
            inset-block-start: 0;
            position: sticky;
            z-index: 1;
        }
    }
</style>
