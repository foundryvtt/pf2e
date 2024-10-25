<script lang="ts">
    import { onMount, type Snippet } from "svelte";
    import { compendiumBrowserContext as context, CompendiumBrowser } from "../browser.svelte.ts";

    interface ResultListProps {
        triggerLoad: () => void;
        children: Snippet;
    }
    let { triggerLoad, children }: ResultListProps = $props();

    onMount(() => {
        // Load initial results
        context.resultLimit = CompendiumBrowser.RESULT_LIMIT;
        triggerLoad();
    });

    function onscroll(event: UIEvent & { currentTarget: EventTarget & HTMLUListElement }): void {
        const list = event.currentTarget;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 5) {
            triggerLoad();
        }
    }
</script>

<ul class="result-list" {onscroll}>
    {@render children()}
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
