<script lang="ts">
    import { slide } from "svelte/transition";
    import type { RangeInputParser, RangesInputData } from "../../tabs/data.ts";

    interface Props {
        name: string;
        parseRangeInput: RangeInputParser;
        range: RangesInputData;
    }
    const { name, parseRangeInput, range = $bindable() }: Props = $props();

    function onChangeRange(event: Event & { currentTarget: HTMLInputElement }): void {
        const elName = event.currentTarget.name;
        const elValue = event.currentTarget.value;
        if (elName === "lowerBound") {
            range.values = parseRangeInput(name, elValue, range.values.inputMax);
        } else if (elName === "upperBound") {
            range.values = parseRangeInput(name, range.values.inputMin, elValue);
        }
        range.changed = true;
    }
</script>

<div class="ranges-container" transition:slide>
    <div class="inputs">
        <input
            type="text"
            autocomplete="off"
            name="lowerBound"
            aria-label={_loc("PF2E.CompendiumBrowser.Filter.Aria.RangeMin", { label: _loc(range.label) })}
            placeholder={range.defaultMin}
            bind:value={range.values.inputMin}
            onchange={onChangeRange}
        />
        -
        <input
            type="text"
            autocomplete="off"
            name="upperBound"
            aria-label={_loc("PF2E.CompendiumBrowser.Filter.Aria.RangeMax", { label: _loc(range.label) })}
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

            input {
                width: 45%;
            }
        }
    }
</style>
