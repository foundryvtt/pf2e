<script lang="ts">
    import Filters from "./filters.svelte";
    import ResultItem from "./result-item.svelte";
    import { CompendiumBrowser } from "../browser.svelte.ts";

    const browser = game.pf2e.compendiumBrowser;
    // Parent gates rendering on `browser.activeTabName` being non-empty, so the cast is safe.
    const activeTabName = $derived(browser.activeTabName as Exclude<typeof browser.activeTabName, "">);
    const tab = $derived(browser.tabs[activeTabName]);

    function resetFilters(): void {
        tab.resetFilters();
    }

    function onscroll(): void {
        if (!browser.activeTabName) return;
        const resultList = browser.resultList;
        if (resultList.scrollTop + resultList.clientHeight >= resultList.scrollHeight - 5) {
            tab.resultLimit += CompendiumBrowser.RESULT_LIMIT;
        }
    }

    $effect(() => {
        if (tab.isGMOnly && !game.user.isGM) {
            browser.activeTabName = "";
            console.error("PF2e System | This browser tab is flagged as GM-only!");
        }
    });
</script>

<div class="browser-tab" data-tab-name={activeTabName} data-tooltip-class="pf2e">
    <Filters bind:filter={tab.filterData} {resetFilters} />
    <ul class="result-list" {onscroll} bind:this={browser.resultList}>
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
