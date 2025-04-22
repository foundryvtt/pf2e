<script lang="ts">
    import Filters from "./filters.svelte";
    import ResultItem from "./result-item.svelte";
    import { CompendiumBrowser, type CompendiumBrowserState } from "../browser.ts";
    import type { ContentTabName } from "../data.ts";

    type BrowserTabProps = { tabName: ContentTabName; state: CompendiumBrowserState };

    const props: BrowserTabProps = $props();
    let resultList: HTMLUListElement;
    const tabName = props.tabName;
    const browser = game.pf2e.compendiumBrowser;
    const tab = browser.tabs[tabName];

    function resetFilters(): void {
        tab.resetFilters();
    }

    function onscroll(): void {
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

<div class="browser-tab" data-tab-name={tabName} data-tooltip-class="pf2e">
    <Filters bind:filter={tab.filterData} {resetFilters} />
    <ul class="result-list" {onscroll} bind:this={resultList}>
        {#each tab.results.slice(0, tab.resultLimit) as entry (entry.uuid)}
            <ResultItem {tabName} {entry} />
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
