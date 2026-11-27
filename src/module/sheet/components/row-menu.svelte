<script lang="ts">
    import PopoverMenu from "./popover-menu.svelte";
    import type { RowMenuEntry, RowMenuState } from "./row-menu.svelte.ts";

    interface RowMenuProps {
        menu: RowMenuState;
        /** The row's name, heading the menu */
        label: string;
        entries: RowMenuEntry[];
    }

    const { menu, label, entries }: RowMenuProps = $props();
</script>

<!-- Rendered inside the row, so an action that looks for its row (delete restoring focus) still finds it -->
{#if menu.open}
    <PopoverMenu
        {label}
        items={entries}
        position={menu.position}
        focusOnRelease={menu.focusOnRelease}
        onSelect={(id, event, item) => entries.find((e) => e.id === id)?.run(event, item)}
        onClose={(refocus) => menu.close(refocus)}
    />
{/if}
