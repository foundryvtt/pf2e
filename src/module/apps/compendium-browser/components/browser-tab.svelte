<script lang="ts">
    import { untrack } from "svelte";
    import type { CompendiumBrowserContext } from "../browser.svelte.ts";
    import Filters from "./filters.svelte";
    import ResultList from "./result-list.svelte";
    import { compendiumBrowserContext as context, CompendiumBrowser } from "../browser.svelte.ts";
    import { ErrorPF2e } from "@util";

    type BrowserTabProps = Pick<CompendiumBrowserContext, "activeTabName">;

    let { activeTabName }: BrowserTabProps = $props();
    if (!activeTabName) {
        throw ErrorPF2e(`Invalid tab name: "${activeTabName}"!`);
    }
    const browser = game.pf2e.compendiumBrowser;
    const tab = browser.tabs[activeTabName];
    if (!tab) {
        throw ErrorPF2e(`Invalid tab "${activeTabName}"!`);
    }

    function rerenderList(): void {
        untrack(() => (context.results.length = 0));
        context.resultListKey = fu.randomID();
    }

    function resetFilters(): void {
        context.activeFilter = fu.deepClone(tab.defaultFilterData);
        rerenderList();
    }

    function loadMore(): void {
        if (!context.activeFilter) return;
        tab.filterData = context.activeFilter;
        if (context.resultLimit === CompendiumBrowser.RESULT_LIMIT) {
            context.results = tab.getIndexData(0, CompendiumBrowser.RESULT_LIMIT);
            context.resultLimit = 2 * CompendiumBrowser.RESULT_LIMIT;
            return;
        }
        const next = tab.currentIndex.slice(context.resultLimit, context.resultLimit + CompendiumBrowser.RESULT_LIMIT);
        context.resultLimit += CompendiumBrowser.RESULT_LIMIT;
        context.results.push(...next);
    }
</script>

<div class="browser-tab" data-tab-name={activeTabName} data-tooltip-class="pf2e">
    {#key context.filterKey}
        <Filters bind:filter={context.activeFilter!} {rerenderList} {resetFilters} />
    {/key}
    {#key context.resultListKey}
        <ResultList {loadMore} />
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
