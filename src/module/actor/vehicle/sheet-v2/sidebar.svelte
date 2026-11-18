<script lang="ts">
    import EmitsSoundSelect from "@actor/sheet/components/emits-sound/emits-sound-select.svelte";
    import AdjustableNumberInput from "@actor/sheet/components/inputs/adjustable-number-input.svelte";
    import NumberInput from "@actor/sheet/components/inputs/number-input.svelte";
    import IWRSection from "@actor/sheet/components/iwr/iwr-section.svelte";
    import SheetSection from "@actor/sheet/components/layout/sheet-section.svelte";
    import type { VehicleSheetV2, VehicleSheetState } from "./sheet.ts";

    interface SidebarProps {
        sheet: VehicleSheetV2;
        data: VehicleSheetState;
    }

    const { sheet, data }: SidebarProps = $props();
    const editable = $derived(data.permissions.editable);
    const disabled = $derived(!editable);
    const sidebar = $derived(data.sidebar);
</script>

<!-- Stat names sit above their values. The visible short form starts the accessible name, for voice control, and
     the long form follows as sr-only -->
<SheetSection label={_loc("PF2E.HitPointsHeader")} class="hit-points">
    <div class="stats hp">
        <div class="stat">
            <span class="label" data-tooltip="PF2E.Item.Physical.BrokenThreshold.Label" aria-hidden="true">
                {_loc("PF2E.vehicle.BrokenThresholdShortLabel")}
            </span>
            <span class="sr-only">{_loc("PF2E.Item.Physical.BrokenThreshold.Label")}</span>
            <span class="value">{sidebar.hp.brokenThreshold}</span>
        </div>
        <label class="stat">
            <span class="label">{_loc("PF2E.CurrentHitPointsShortLabel")}</span>
            <NumberInput
                name="system.attributes.hp.value"
                value={sidebar.hp.value}
                min={0}
                max={sidebar.hp.max}
                {disabled}
                onCommit={(value) => sheet.updateField("system.attributes.hp.value", value)}
            />
            <span class="sr-only">({_loc("PF2E.vehicle.CurrentHPTitle")})</span>
        </label>
        <label class="stat">
            <span class="label">{_loc("PF2E.MaxHitPointsShortLabel")}</span>
            <AdjustableNumberInput
                name="system.attributes.hp.max"
                min={0}
                value={sidebar.hp.max}
                source={sidebar.hp.maxSource}
                {disabled}
                onCommit={(value) => sheet.updateField("system.attributes.hp.max", value)}
            />
            <span class="sr-only">({_loc("PF2E.vehicle.MaxHPTitle")})</span>
        </label>
    </div>
</SheetSection>

<SheetSection label={_loc("PF2E.ArmorClassLabel")} class="defenses">
    <div class="stats">
        <label class="stat">
            <span class="label">{_loc("PF2E.ArmorClassShortLabel")}</span>
            <AdjustableNumberInput
                name="system.attributes.ac.value"
                value={sidebar.ac.value}
                source={sidebar.ac.source}
                {disabled}
                onCommit={(value) => sheet.updateField("system.attributes.ac.value", value)}
            />
            <span class="sr-only">({_loc("PF2E.ArmorClassLabel")})</span>
        </label>
        <label class="stat">
            <span class="label" data-tooltip="PF2E.vehicle.HardnessLabel">
                {_loc("PF2E.vehicle.HardnessShortLabel")}
            </span>
            <AdjustableNumberInput
                name="system.attributes.hardness"
                min={0}
                value={sidebar.hardness.value}
                source={sidebar.hardness.source}
                {disabled}
                onCommit={(value) => sheet.updateField("system.attributes.hardness", value)}
            />
            <span class="sr-only">({_loc("PF2E.vehicle.HardnessLabel")})</span>
        </label>
    </div>
</SheetSection>

<SheetSection label={_loc("PF2E.SavesHeader")} class="saves">
    <div class="save">
        {#if editable}
            <button
                type="button"
                class="flat roll"
                aria-label={_loc("PF2E.SavesFortitude")}
                data-action="rollStatistic"
                data-statistic="fortitude"
            >
                <i class="fa-solid fa-dice-d20" aria-hidden="true"></i>
                <span>{_loc("PF2E.SavesFortitude")}</span>
            </button>
        {:else}
            <span>{_loc("PF2E.SavesFortitude")}</span>
        {/if}
        <AdjustableNumberInput
            name="system.saves.fortitude.value"
            value={sidebar.fortitude.value}
            source={sidebar.fortitude.source}
            signed
            {disabled}
            aria-label={_loc("PF2E.SavesFortitude")}
            onCommit={(value) => sheet.updateField("system.saves.fortitude.value", value)}
        />
    </div>
</SheetSection>

<IWRSection lists={sidebar.iwr} {editable} />

<EmitsSoundSelect
    value={sidebar.emitsSound}
    title={_loc("PF2E.Actor.Vehicle.EmitsSound.Title")}
    hint={_loc("PF2E.Actor.Vehicle.EmitsSound.Hint")}
    {disabled}
    onCommit={(value) => sheet.updateEmitsSound(value)}
/>

<style>
    /* Label and value rows are shared across cells, so BT lines up with the inputs */
    .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
        grid-template-rows: auto auto;
        gap: var(--space-2) var(--space-4);
    }

    /* Current HP is the one that changes in play */
    .stats.hp {
        grid-template-columns: 1fr 1.25fr 1fr;
    }

    .stat {
        display: grid;
        grid-row: span 2;
        grid-template-rows: subgrid;
        justify-items: center;
        min-width: 0;

        .value,
        :global(input) {
            width: 100%;
            height: auto;
            font-size: var(--font-size-20);
            text-align: center;
        }

        /* Fills the row the inputs set, centered like their text */
        .value {
            display: grid;
            align-items: center;
        }

        .label {
            font-size: var(--font-size-11);
            text-transform: uppercase;
            white-space: nowrap;
            color: var(--color-text-secondary);
        }
    }

    .save {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);

        button.roll {
            display: flex;
            align-items: center;
            gap: var(--space-4);
            padding: 0;
        }

        :global(input) {
            width: 3.5rem;
            text-align: center;
        }
    }
</style>
