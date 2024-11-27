<script lang="ts">
    import Filters from "./filters.svelte";
    import ResultList from "./result-list.svelte";
    import { type CompendiumBrowserState, CompendiumBrowser } from "../browser.ts";
    import { ErrorPF2e } from "@util";

    type BrowserTabProps = { state: CompendiumBrowserState };

    const props: BrowserTabProps = $props();
    const state = props.state;
    const activeTabName = state.activeTabName;
    if (!activeTabName) {
        throw ErrorPF2e(`Invalid tab name: "${activeTabName}"!`);
    }
    const browser = game.pf2e.compendiumBrowser;
    const tab = browser.tabs[activeTabName];
    if (!tab) {
        throw ErrorPF2e(`Invalid tab "${activeTabName}"!`);
    }

    function resetFilters(): void {
        state.activeFilter = fu.deepClone(tab.defaultFilterData);
        browser.renderParts("filter", "resultList");
    }

    function loadMore(): void {
        if (!state.activeFilter) return;
        tab.filterData = state.activeFilter;
        if (state.resultLimit === CompendiumBrowser.RESULT_LIMIT) {
            state.results = tab.getIndexData(0, CompendiumBrowser.RESULT_LIMIT);
            state.resultLimit = 2 * CompendiumBrowser.RESULT_LIMIT;
            return;
        }
        const next = tab.currentIndex.slice(state.resultLimit, state.resultLimit + CompendiumBrowser.RESULT_LIMIT);
        state.resultLimit += CompendiumBrowser.RESULT_LIMIT;
        state.results.push(...next);
    }
</script>

<div class="browser-tab" data-tab-name={activeTabName} data-tooltip-class="pf2e">
    {#key state.filterKey}
        <Filters bind:filter={state.activeFilter!} {resetFilters} />
    {/key}
    {#key state.resultListKey}
        <ResultList {state} {loadMore} />
    {/key}
</div>

<style lang="scss">
    .browser-tab {
        display: grid;
        grid-template-columns: 19em auto;
        min-height: 9em;
        height: 100%;
    }
</style>
