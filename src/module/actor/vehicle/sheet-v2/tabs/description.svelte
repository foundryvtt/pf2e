<script lang="ts">
    import DescriptionEditor from "@actor/sheet/components/description/description-editor.svelte";
    import SheetSection from "@actor/sheet/components/layout/sheet-section.svelte";
    import PublicationFields from "@actor/sheet/components/publication/publication-fields.svelte";
    import type { VehicleSheetV2, VehicleSheetState } from "../sheet.ts";

    interface DescriptionProps {
        sheet: VehicleSheetV2;
        data: VehicleSheetState;
    }

    const { sheet, data }: DescriptionProps = $props();
    const editable = $derived(data.permissions.editable);
</script>

<div class="description-tab">
    <SheetSection label={_loc("PF2E.vehicle.DescriptionHeading")} class="description">
        <DescriptionEditor
            name="system.details.description"
            value={data.description.value}
            enriched={data.description.enriched}
            documentUUID={sheet.actor.uuid}
            {editable}
            onchange={(value) => sheet.updateField("system.details.description", value)}
        />
    </SheetSection>

    <PublicationFields
        publication={data.description.publication}
        path="system.details.publication"
        disabled={!editable}
        onUpdate={(key, value) => sheet.updateField(`system.details.publication.${key}`, value)}
    />
</div>

<style>
    .description-tab {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: var(--space-10);
        min-height: 0;

        > :global(.description) {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
        }
    }
</style>
