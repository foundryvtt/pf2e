<script lang="ts">
    import type { CheckboxData, RangesInputData, LevelData } from "../../../tabs/data.ts";

    interface Props {
        data: CheckboxData | RangesInputData | LevelData;
        options: {
            visible: boolean;
            name?: string;
        };
    }
    const { data, options }: Props = $props();

    function onClearFilter(): void {
        if ("selected" in data) {
            for (const opt of data.selected) {
                data.options[opt].selected = false;
            }
            data.selected = [];
        } else if ("from" in data) {
            data.from = data.min;
            data.to = data.max;
            data.changed = false;
        } else if ("values" in data && options.name) {
            const activeTab = game.pf2e.compendiumBrowser.activeTab;
            if (!activeTab) return;
            data.values = activeTab.parseRangeFilterInput(options.name, data.defaultMin, data.defaultMax);
            data.changed = false;
        }
    }
</script>

{#if options.visible}
    <button type="button" class="clear-filter" onclick={onClearFilter}>
        {game.i18n.localize("PF2E.CompendiumBrowser.Filter.ClearFilter")}
    </button>
{/if}

<style lang="scss">
    button.clear-filter {
        &:not(:hover) {
            background-color: var(--background);
        }
        line-height: 1.5em;
        position: absolute;
        right: var(--space-10);
        top: var(--space-1);
        width: auto;
    }
</style>
