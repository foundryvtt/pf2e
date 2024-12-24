<script lang="ts">
    import Filters from "./filters.svelte";
    import ResultItem from "./result-item.svelte";
    import { ErrorPF2e } from "@util";
    import { CompendiumBrowser, type CompendiumBrowserState } from "../browser.ts";
    import type { ContentTabName } from "../data.ts";

    type BrowserTabProps = { activeTabName: ContentTabName; state: CompendiumBrowserState };

    const { activeTabName = $bindable(), ...props }: BrowserTabProps = $props();
    if (!activeTabName) {
        throw ErrorPF2e(`Invalid tab name: "${activeTabName}"!`);
    }
    const browser = game.pf2e.compendiumBrowser;
    const tab = $derived(browser.tabs[activeTabName]);

    function resetFilters(): void {
        tab.resetFilters();
    }

    function onscroll(): void {
        if (!activeTabName) return;
        const resultList = props.state.resultList;
        if (resultList.scrollTop + resultList.clientHeight >= resultList.scrollHeight - 5) {
            tab.resultLimit += CompendiumBrowser.RESULT_LIMIT;
        }
    }

    $effect(() => {
        if (tab.isGMOnly && !game.user.isGM) {
            props.state.activeTabName = "";
            console.error("PF2e System | This browser tab is flagged as GM-only!");
        }
    });
</script>

<div class="browser-tab" data-tab-name={activeTabName} data-tooltip-class="pf2e">
    <Filters bind:filter={tab.filterData} {resetFilters} />
    <ul class="result-list" {onscroll} bind:this={props.state.resultList}>
        {#each tab.results.slice(0, tab.resultLimit) as entry (entry.uuid)}
            <ResultItem {activeTabName} {entry} />
        {/each}
    </ul>
</div>

<style lang="scss">
    .browser-tab {
        display: grid;
        grid-template-columns: 19em auto;
        min-height: 9em;
        height: 100%;

        ul.result-list {
            display: flex;
            flex-direction: column;
            height: 100%;
            margin: 5px 0 0 0;
            padding: 0;
            width: 100%;
            overflow: visible scroll;
        }
    }
</style>
