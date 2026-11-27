<script lang="ts">
    import NumberInput from "@actor/sheet/components/inputs/number-input.svelte";
    import TextInput from "@actor/sheet/components/inputs/text-input.svelte";
    import ActorPortrait from "@actor/sheet/components/portrait/actor-portrait.svelte";
    import TraitTags from "@actor/sheet/components/traits/trait-tags.svelte";
    import type { VehicleSheetV2, VehicleSheetState } from "../sheet.ts";

    interface DetailsProps {
        sheet: VehicleSheetV2;
        data: VehicleSheetState;
    }

    const { sheet, data }: DetailsProps = $props();
    const editable = $derived(data.permissions.editable);
    const disabled = $derived(!editable);
    const details = $derived(data.details);
    const uid = $props.id();

    const update = (path: string) => (value: unknown) => sheet.updateField(path, value);

    // Tooltips are pointer-only, so the same descriptions are also each field's accessible description
    const descriptions = [
        "Space",
        "Price",
        "Speed",
        "Crew",
        "Passengers",
        "CollisionDC",
        "CollisionDamage",
        "PilotingCheck",
    ] as const;
    const describedBy = (key: (typeof descriptions)[number]) => `${uid}-description-${key}`;
</script>

<div class="details">
    <div class="portrait">
        <ActorPortrait img={data.img} name={data.name} {editable} />
    </div>

    <div class="overview">
        <fieldset class="space" aria-describedby={describedBy("Space")}>
            <legend class="sr-only">{_loc("PF2E.vehicle.SpaceLabel")}</legend>
            <label>
                <span data-tooltip="PF2E.vehicle.PropertyDescriptionSpace">{_loc("PF2E.vehicle.SpaceLongLabel")}</span>
                <NumberInput
                    name="system.details.space.long"
                    value={details.space.long}
                    min={5}
                    max={300}
                    step={5}
                    {disabled}
                    onCommit={update("system.details.space.long")}
                />
            </label>
            <label>
                <span data-tooltip="PF2E.vehicle.PropertyDescriptionSpace">{_loc("PF2E.vehicle.SpaceWideLabel")}</span>
                <NumberInput
                    name="system.details.space.wide"
                    value={details.space.wide}
                    min={5}
                    max={300}
                    step={5}
                    {disabled}
                    onCommit={update("system.details.space.wide")}
                />
            </label>
            <label>
                <span data-tooltip="PF2E.vehicle.PropertyDescriptionSpace">{_loc("PF2E.vehicle.SpaceHighLabel")}</span>
                <NumberInput
                    name="system.details.space.high"
                    value={details.space.high}
                    min={5}
                    max={300}
                    step={5}
                    {disabled}
                    onCommit={update("system.details.space.high")}
                />
            </label>
        </fieldset>
        <label>
            <span data-tooltip="PF2E.vehicle.PropertyDescriptionPrice">{_loc("PF2E.PriceLabel")}</span>
            <NumberInput
                name="system.details.price"
                aria-describedby={describedBy("Price")}
                value={details.price}
                min={0}
                {disabled}
                onCommit={update("system.details.price")}
            />
        </label>
        <label>
            <span data-tooltip="PF2E.vehicle.PropertyDescriptionSpeed">{_loc("PF2E.Actor.Speed.Label")}</span>
            <TextInput
                name="system.details.speed"
                aria-describedby={describedBy("Speed")}
                value={details.speed}
                {disabled}
                onCommit={update("system.details.speed")}
            />
        </label>
    </div>

    <div class="properties">
        <label>
            <span data-tooltip="PF2E.vehicle.PropertyDescriptionCrew">{_loc("PF2E.vehicle.CrewLabel")}</span>
            <TextInput
                name="system.details.crew"
                aria-describedby={describedBy("Crew")}
                value={details.crew}
                {disabled}
                onCommit={update("system.details.crew")}
            />
        </label>
        <label>
            <span data-tooltip="PF2E.vehicle.PropertyDescriptionPassengers">
                {_loc("PF2E.vehicle.PassengersLabel")}
            </span>
            <TextInput
                name="system.details.passengers"
                aria-describedby={describedBy("Passengers")}
                value={details.passengers}
                {disabled}
                onCommit={update("system.details.passengers")}
            />
        </label>
        <label>
            <span data-tooltip="PF2E.vehicle.PropertyDescriptionCollisionDC">
                {_loc("PF2E.vehicle.collisionDCLabel")}
            </span>
            <NumberInput
                name="system.attributes.collisionDC.value"
                aria-describedby={describedBy("CollisionDC")}
                value={details.collisionDC}
                {disabled}
                onCommit={update("system.attributes.collisionDC.value")}
            />
        </label>
        <label>
            <span data-tooltip="PF2E.vehicle.PropertyDescriptionCollisionDamage">
                {_loc("PF2E.vehicle.collisionDamageLabel")}
            </span>
            <TextInput
                name="system.attributes.collisionDamage.value"
                aria-describedby={describedBy("CollisionDamage")}
                value={details.collisionDamage}
                {disabled}
                onCommit={update("system.attributes.collisionDamage.value")}
            />
        </label>
        <label class="wide">
            <span data-tooltip="PF2E.vehicle.PropertyDescriptionPilotingCheck">
                {_loc("PF2E.vehicle.PilotingCheckLabel")}
            </span>
            <TextInput
                name="system.details.pilotingCheck"
                aria-describedby={describedBy("PilotingCheck")}
                value={details.pilotingCheck}
                {disabled}
                onCommit={update("system.details.pilotingCheck")}
            />
        </label>
    </div>

    <div class="traits" role="group" aria-labelledby="{uid}-traits">
        <span class="label" id="{uid}-traits">{_loc("PF2E.Traits")}</span>
        <TraitTags
            traits={details.traits}
            subject={_loc("PF2E.Traits")}
            editAction={editable ? "openTraitSelector" : undefined}
        />
    </div>

    <div hidden>
        {#each descriptions as key (key)}
            <p id={describedBy(key)}>{_loc(`PF2E.vehicle.PropertyDescription${key}`)}</p>
        {/each}
    </div>
</div>

<style>
    .details {
        display: grid;
        grid-template-columns: 9rem 1fr;
        grid-template-areas:
            "portrait overview"
            "properties properties"
            "traits traits";
        gap: var(--spacer-8);
        align-items: start;
    }

    .portrait {
        grid-area: portrait;
    }

    label,
    .traits {
        display: flex;
        flex-direction: column;
        gap: var(--spacer-2);

        span,
        .label {
            font-size: var(--font-size-12);
            text-transform: uppercase;
            color: var(--color-form-label);
        }
    }

    .overview {
        grid-area: overview;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        gap: var(--spacer-8);
    }

    fieldset.space {
        grid-column: span 2;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--spacer-8);
        min-inline-size: 0;
        margin: 0;
        border: none;
        padding: 0;
    }

    .properties {
        grid-area: properties;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--spacer-8);

        .wide {
            grid-column: span 2;
        }
    }

    .traits {
        grid-area: traits;
    }
</style>
