<script lang="ts">
    import { commitInput, type Commit } from "../inputs/helpers.ts";
    import SheetSection from "../layout/sheet-section.svelte";

    type EmitsSound = boolean | "encounter";

    interface EmitsSoundSelectProps {
        value: EmitsSound;
        /** Localized heading, which labels the select */
        title: string;
        /** Localized explanation, shown as a tooltip and read as the select's description */
        hint: string;
        disabled: boolean;
        onCommit: Commit<EmitsSound>;
    }

    const { value, title, hint, disabled, onCommit }: EmitsSoundSelectProps = $props();
    const uid = $props.id();

    const options = [
        { value: "true", label: "PF2E.Actor.Hazard.EmitsSound.True" },
        { value: "false", label: "PF2E.Actor.Hazard.EmitsSound.False" },
        { value: "encounter", label: "PF2E.Actor.Hazard.EmitsSound.Encounter" },
    ];

    // The stored value is a boolean or "encounter". The select's values are strings.
    const onchange = (event: Event & { currentTarget: HTMLSelectElement }): Promise<void> => {
        const select = event.currentTarget;
        const next = select.value === "encounter" ? "encounter" : select.value === "true";
        return commitInput(select, () => onCommit(next));
    };
</script>

<SheetSection label={title} class="emits-sound">
    {#snippet heading()}
        <label for="{uid}-select">{title}</label>
        <i class="fa-solid fa-circle-info" data-tooltip={hint} data-tooltip-direction="RIGHT" aria-hidden="true"></i>
    {/snippet}
    <p id="{uid}-hint" class="sr-only">{hint}</p>
    <select id="{uid}-select" value={String(value)} {disabled} aria-describedby="{uid}-hint" {onchange}>
        {#each options as option (option.value)}
            <option value={option.value}>{_loc(option.label)}</option>
        {/each}
    </select>
</SheetSection>

<style>
    i {
        font-size: var(--font-size-12);
        color: var(--color-text-secondary);
    }
</style>
