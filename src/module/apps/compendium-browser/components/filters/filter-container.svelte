<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        clearButton?: {
            options: {
                visible: boolean;
            };
            clear: () => void;
        };
        isExpanded?: boolean;
        label: string;
    }
    const props: Props = $props();
    // The prop only provides the initial value; this component controls isExpanded after that.
    // svelte-ignore state_referenced_locally
    let isExpanded = $state(props.isExpanded);
</script>

<div class="filter-container">
    <fieldset>
        <legend>
            {#if "isExpanded" in props}
                <button
                    type="button"
                    class="flat expand-section"
                    onclick={() => (isExpanded = !isExpanded)}
                    aria-expanded={isExpanded}
                >
                    <i class="fa-solid fa-fw {isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'}" aria-hidden="true"></i>
                    <span>{_loc(props.label)}</span>
                </button>
            {:else}
                {_loc(props.label)}
            {/if}
        </legend>
        {#if isExpanded === undefined || isExpanded}
            {@render props.children()}
        {/if}
    </fieldset>
    {#if props.clearButton?.options.visible}
        <button type="button" class="clear-filter" onclick={() => props.clearButton?.clear()}>
            {_loc("PF2E.CompendiumBrowser.Filter.ClearFilter")}
        </button>
    {/if}
</div>

<style lang="scss">
    .filter-container {
        margin: var(--space-8) var(--space-2);
        position: relative;

        button.clear-filter {
            line-height: 1.5em;
            position: absolute;
            right: var(--space-10);
            top: calc(1.25em * 1.25 / 2);
            width: auto;
            translate: 0 -50%;

            &:not(:hover) {
                background: var(--background);
            }
        }
    }

    fieldset {
        border: 2px groove var(--color-fieldset-border);
        margin: 0;
        border-radius: var(--space-5);
        padding: var(--space-6);

        legend {
            display: flex;
            height: 1.25em;
            line-height: 1.25em;
            font-size: 1.25em;

            button.expand-section {
                align-items: center;
                border: unset;
                background: unset;
                display: flex;
                font-size: inherit;
                padding: 0 var(--space-2);
                width: fit-content;

                i {
                    font-size: 0.8em;
                    margin-right: 0.25em;
                    margin-left: unset;
                }
            }
        }
    }
</style>
