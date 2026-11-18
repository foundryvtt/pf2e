<script lang="ts">
    import NumberInput from "@actor/sheet/components/inputs/number-input.svelte";
    import SelectInput from "@actor/sheet/components/inputs/select-input.svelte";
    import TextInput from "@actor/sheet/components/inputs/text-input.svelte";
    import type { VehicleSheetV2, VehicleSheetState } from "./sheet.ts";

    interface HeaderProps {
        sheet: VehicleSheetV2;
        data: VehicleSheetState;
    }

    const { sheet, data }: HeaderProps = $props();
    const disabled = $derived(!data.permissions.editable);
</script>

<header class="sheet-header">
    <TextInput
        name="name"
        class="name"
        value={data.name}
        placeholder={_loc("PF2E.vehicle.NamePlaceholder")}
        aria-label={_loc("DOCUMENT.FIELDS.name.label")}
        {disabled}
        onCommit={(value) => sheet.updateField("name", value)}
    />
    <div class="selects">
        <SelectInput
            name="system.traits.rarity"
            value={data.header.rarity}
            options={data.header.rarityOptions}
            aria-label={_loc("PF2E.Rarity")}
            {disabled}
            onCommit={(value) => sheet.updateField("system.traits.rarity", value)}
        />
        <SelectInput
            name="system.traits.size.value"
            value={data.header.size}
            options={data.header.sizeOptions}
            aria-label={_loc("PF2E.SizeLabel")}
            {disabled}
            onCommit={(value) => sheet.updateField("system.traits.size.value", value)}
        />
    </div>
    <label class="level">
        <span>
            {_loc("PF2E.vehicle.VehicleLevelLabel")}
            <span class="sr-only">{_loc("PF2E.LevelLabel")}</span>
        </span>
        <NumberInput
            name="system.details.level.value"
            value={data.header.level}
            min={-1}
            {disabled}
            onCommit={(value) => sheet.updateField("system.details.level.value", value)}
        />
    </label>
</header>

<style>
    .sheet-header {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-areas:
            "name level"
            "selects level";
        gap: var(--spacer-2) var(--spacer-8);
        padding-block-end: var(--spacer-4);
    }

    .sheet-header > :global(input.name) {
        grid-area: name;
        height: auto;
        padding-block: 0;
        font-family: var(--serif);
        font-size: var(--font-size-20);
        font-weight: 600;
        border: none;
        border-block-end: 1px solid transparent;
        border-radius: 0;
        background: none;

        &:hover:not(:disabled),
        &:focus {
            border-block-end-color: var(--color-border);
        }
    }

    .selects {
        grid-area: selects;
        display: flex;
        gap: var(--spacer-4);

        :global(select) {
            width: auto;
            height: 1.375rem;
            font-size: var(--font-size-12);
            text-transform: uppercase;
        }
    }

    .level {
        grid-area: level;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacer-2);
        font-size: var(--font-size-12);
        text-transform: uppercase;

        :global(input) {
            width: 3.5rem;
            height: var(--spacer-28);
            font-size: var(--font-size-20);
            text-align: center;
        }
    }
</style>
