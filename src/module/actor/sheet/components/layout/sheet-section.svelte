<script lang="ts">
    import type { Snippet } from "svelte";

    interface SheetSectionProps {
        /** Localized heading text */
        label: string;
        /** Replaces the heading text, e.g. to wrap it in a label for a control */
        heading?: Snippet;
        /** Buttons beside the heading */
        controls?: Snippet;
        /** Keep the heading for assistive tech only */
        hideHeading?: boolean;
        class?: string;
        children: Snippet;
    }

    const { label, heading, controls, hideHeading = false, class: className, children }: SheetSectionProps = $props();
    const uid = $props.id();
</script>

<section class={["sheet-section", className]} aria-labelledby="{uid}-heading">
    <header class:sr-only={hideHeading}>
        <h2 id="{uid}-heading">
            {#if heading}{@render heading()}{:else}{label}{/if}
        </h2>
        {@render controls?.()}
    </header>
    {@render children()}
</section>

<style>
    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacer-4);
        margin-block-end: var(--spacer-4);
        border-block-end: 1px solid var(--color-border);
    }

    h2 {
        display: flex;
        align-items: center;
        gap: var(--spacer-4);
        margin: 0;
        border: none;
        font-size: var(--font-size-16);
    }
</style>
