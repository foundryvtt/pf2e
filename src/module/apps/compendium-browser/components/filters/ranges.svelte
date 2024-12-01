<script lang="ts">
    import { slide } from "svelte/transition";
    import ClearFilterButton from "./partials/clear-filter-button.svelte";
    import type { RangesInputData } from "../../tabs/data.ts";

    const props: { name: string; range: RangesInputData } = $props();
    let range = $state(props.range);

    function onChangeRange(event: Event & { currentTarget: HTMLInputElement }): void {
        const activeTab = game.pf2e.compendiumBrowser.activeTab;
        if (!activeTab) return;
        const elName = event.currentTarget.name;
        const elValue = event.currentTarget.value;
        if (elName === "lowerBound") {
            range.values = activeTab.parseRangeFilterInput(props.name, elValue, range.values.inputMax);
        } else if (elName === "upperBound") {
            range.values = activeTab.parseRangeFilterInput(props.name, range.values.inputMin, elValue);
        }
        range.changed = true;
        game.pf2e.compendiumBrowser.renderParts("resultList");
    }
</script>

<div class="ranges-container" transition:slide>
    <ClearFilterButton data={range} options={{ enabled: range.changed, name: props.name }} />
    <div class="inputs">
        <input
            type="text"
            autocomplete="off"
            name="lowerBound"
            placeholder={range.defaultMin}
            bind:value={range.values.inputMin}
            onchange={onChangeRange}
        />
        -
        <input
            type="text"
            autocomplete="off"
            name="upperBound"
            placeholder={range.defaultMax}
            bind:value={range.values.inputMax}
            onchange={onChangeRange}
        />
    </div>
</div>

<style lang="scss">
    .ranges-container {
        display: flex;
        flex-direction: column;

        .inputs {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 0.5em;

            input,
            select {
                width: 45%;
            }
        }
    }
</style>
