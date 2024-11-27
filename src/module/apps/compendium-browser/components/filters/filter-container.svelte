<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
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
                {game.i18n.localize(props.label)}
                <i class="fa-solid {isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
            </button>
        {:else}
            {game.i18n.localize(props.label)}
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
                    margin-right: unset;
                    margin-left: 0.25em;
                }
            }
        }
    }
</style>
