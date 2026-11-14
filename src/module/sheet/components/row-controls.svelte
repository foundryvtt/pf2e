<script lang="ts">
    import InlineIconButton from "./inline-icon-button.svelte";
    import { SMALL_CONTROL_SIZE, type RowControl } from "./row-controls.ts";

    interface RowControlsProps {
        controls: RowControl[];
        /** Localized name of the row's subject, added to each button's accessible name */
        subject: string;
    }

    const { controls, subject }: RowControlsProps = $props();
</script>

<div class="item-controls" style:--pf2e-inline-button-size={SMALL_CONTROL_SIZE}>
    {#each controls as control (control.label)}
        <InlineIconButton
            icon={control.icon}
            data-tooltip={control.label}
            aria-label="{_loc(control.label)}: {subject}"
            aria-pressed={control.pressed}
            onclick={(event) => control.onClick(event, event.currentTarget)}
        />
    {/each}
</div>

<style>
    .item-controls {
        display: flex;
        gap: var(--space-2);
        justify-self: end;
    }
</style>
