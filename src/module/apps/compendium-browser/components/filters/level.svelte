<script lang="ts">
    import * as R from "remeda";
    import { slide } from "svelte/transition";
    import type { LevelData } from "../../tabs/data.ts";

    interface Props {
        level: LevelData;
    }
    const props: Props = $props();
    let level = $state(props.level);

    function onChangeLevel(event: Event & { currentTarget: HTMLSelectElement }) {
        const name = event.currentTarget.name;
        const value = Math.clamp(Number(event.currentTarget.value), level.min, level.max);
        if (name === "from") {
            if (value > level.to) {
                level.to = value;
            }
            level.from = value;
        } else if (name === "to") {
            if (value < level.from) {
                level.from = value;
            }
            level.to = value;
        }
        level.changed = level.from !== level.min || level.to !== level.max;
        game.pf2e.compendiumBrowser.renderParts("resultList");
    }
</script>

<div class="levels-container" transition:slide>
    <div class="inputs">
        <select name="from" value={level.from} onchange={onChangeLevel}>
            {#each R.range(level.min, level.max + 1) as n}
                <option value={n}>{n}</option>
            {/each}
        </select>
        -
        <select name="to" value={level.to} onchange={onChangeLevel}>
            {#each R.range(level.min, level.max + 1) as n}
                <option value={n}>{n}</option>
            {/each}
        </select>
    </div>
</div>

<style lang="scss">
    .levels-container {
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
