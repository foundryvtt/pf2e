<script lang="ts">
    import Filters from "./filters.svelte";
    import ResultItem from "./result-item.svelte";
    import { CompendiumBrowser } from "../browser.svelte.ts";
    import type { RangeInputParser } from "../tabs/data.ts";

    interface Props {
        foundryApp: CompendiumBrowser;
        panelId: string;
        /** Null when the tab strip is hidden */
        labelledBy: string | null;
    }
    const { foundryApp: browser, panelId, labelledBy }: Props = $props();
    // Parent gates rendering on `browser.activeTabName` being non-empty, so the cast is safe.
    const activeTabName = $derived(browser.activeTabName as Exclude<typeof browser.activeTabName, "">);
    const tab = $derived(browser.tabs[activeTabName]);

    function resetFilters(): void {
        tab.resetFilters();
    }

    const parseRangeInput: RangeInputParser = (name, lower, upper) => tab.parseRangeFilterInput(name, lower, upper);

    function onDragFade(faded: boolean): void {
        if (faded) {
            gsap.to(browser.element, { duration: 0.25, opacity: 0.125, pointerEvents: "none" });
        } else {
            window.setTimeout(() => {
                gsap.to(browser.element, { duration: 0.25, opacity: 1, pointerEvents: "" });
            }, CompendiumBrowser.DRAG_END_RESTORE_DELAY);
        }
    }

    function onscroll(event: Event & { currentTarget: HTMLUListElement }): void {
        if (!browser.activeTabName) return;
        const resultList = event.currentTarget;
        const threshold = CompendiumBrowser.SCROLL_LOAD_THRESHOLD;
        if (resultList.scrollTop + resultList.clientHeight >= resultList.scrollHeight - threshold) {
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

<div
    class="browser-tab"
    id={panelId}
    role={labelledBy ? "tabpanel" : null}
    aria-labelledby={labelledBy}
    data-tab-name={activeTabName}
    data-tooltip-class="pf2e"
>
    <Filters bind:filter={tab.filterData} {resetFilters} {parseRangeInput} />
    <ul class="result-list" {onscroll} bind:this={browser.resultList}>
        {#each tab.results.slice(0, tab.resultLimit) as entry (entry.uuid)}
            <ResultItem {activeTabName} {entry} {onDragFade} />
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
