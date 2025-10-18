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
        notExpandable?: boolean;
        label: string;
    }
    let { isExpanded = $bindable(), ...props }: Props = $props();
</script>

<fieldset>
    <legend>
        {#if !props.notExpandable}
            <button
                type="button"
                class="flat expand-section"
                onclick={() => (isExpanded = !isExpanded)}
                aria-label="expand"
                aria-expanded={isExpanded}
            >
                <i class="fa-solid fa-fw {isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                <span>{game.i18n.localize(props.label)}</span>
            </button>
        {:else}
            {game.i18n.localize(props.label)}
        {/if}
        {#if props.clearButton?.options.visible}
            <button type="button" class="clear-filter" onclick={() => props.clearButton?.clear()}>
                {game.i18n.localize("PF2E.CompendiumBrowser.Filter.ClearFilter")}
            </button>
        {/if}
    </legend>
    {#if isExpanded === undefined || isExpanded}
        {@render props.children()}
    {/if}
</fieldset>

<style lang="scss">
    fieldset {
        border: 1px solid #bbb;
        margin: var(--space-8) var(--space-2);
        border-radius: var(--space-5);
        padding: var(--space-6);
        position: relative;

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

            button.clear-filter {
                &:not(:hover) {
                    background: var(--background);
                }
                line-height: 1.5em;
                position: absolute;
                right: var(--space-10);
                top: var(--space-1);
                width: auto;
            }
        }
    }
</style>
