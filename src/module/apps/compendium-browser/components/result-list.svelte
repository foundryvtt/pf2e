<script lang="ts">
    import { onMount } from "svelte";
    import ResultItem from "./result-item.svelte";
    import { compendiumBrowserContext as context, CompendiumBrowser } from "../browser.svelte.ts";

    let { loadMore }: { loadMore: () => void } = $props();

    onMount(() => {
        // Load initial results
        context.resultLimit = CompendiumBrowser.RESULT_LIMIT;
        loadMore();
    });

    function onscroll(event: UIEvent & { currentTarget: EventTarget & HTMLUListElement }): void {
        const list = event.currentTarget;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 5) {
            loadMore();
        }
    }
</script>

<ul class="result-list" {onscroll}>
    {#each context.results as entry (entry.uuid)}
        <ResultItem {entry} />
    {/each}
</ul>

<style lang="scss">
    ul.result-list {
        display: flex;
        flex-direction: column;
        height: 100%;
        margin: 5px 0 0 0;
        padding: 0;
        width: 100%;
        overflow: visible scroll;
    }
</style>
