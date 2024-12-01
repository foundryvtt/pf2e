<script lang="ts">
    import ClearFilterButton from "./partials/clear-filter-button.svelte";
    import type { Snippet } from "svelte";
    import type { CheckboxData, RangesInputData, LevelData } from "../../tabs/data.ts";

    interface Props {
        children: Snippet;
        clearButton?: {
            data: CheckboxData | RangesInputData | LevelData;
            options: {
                name?: string;
                visible: boolean;
            };
        };
        isExpanded?: boolean;
        label: string;
    }
    const props: Props = $props();
    let isExpanded = $state(props.isExpanded);
</script>

<fieldset>
    <legend>
        {#if "isExpanded" in props}
            <button
                type="button"
                class="expand-section"
                onclick={() => (isExpanded = !isExpanded)}
                aria-label="expand"
                aria-expanded={isExpanded}
            >
                <i class="fa-solid fa-fw {isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                {game.i18n.localize(props.label)}
            </button>
        {:else}
            {game.i18n.localize(props.label)}
        {/if}
        {#if props.clearButton}
            <ClearFilterButton data={props.clearButton.data} options={props.clearButton.options} />
        {/if}
    </legend>
    {#if isExpanded === undefined || isExpanded}
        {@render props.children()}
    {/if}
</fieldset>

<style lang="scss">
    fieldset {
        border: 1px solid #bbb;
        margin-top: var(--space-4);
        border-radius: var(--space-5);
        padding: var(--space-6);
        position: relative;

        legend {
            display: flex;
            height: 1.5em;
            font-size: 1.25em;
            margin-bottom: var(--space-2);

            button.expand-section {
                border: unset;
                background: unset;
                padding: var(--space-2);
                width: fit-content;
                font-size: inherit;

                &:hover {
                    color: var(--button-text-color);
                }

                i {
                    font-size: 0.8em;
                    margin-right: 0.25em;
                    margin-left: unset;
                }
            }
        }
    }
</style>
