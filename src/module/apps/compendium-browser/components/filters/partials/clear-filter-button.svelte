<script lang="ts">
    import type { CheckboxData, RangesInputData, LevelData } from "../../../tabs/data.ts";

    interface Props {
        data: CheckboxData | RangesInputData | LevelData;
        options: {
            enabled: boolean;
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
        } else if ("values" in data && name) {
            const activeTab = game.pf2e.compendiumBrowser.activeTab;
            if (!activeTab) return;
            data.values = activeTab.parseRangeFilterInput(name, data.defaultMin, data.defaultMax);
            data.changed = false;
        }
        game.pf2e.compendiumBrowser.renderParts("resultList");
    }
</script>

<div class="clear-filter">
    <button type="button" disabled={!options.enabled} onclick={onClearFilter}>
        {game.i18n.localize("PF2E.CompendiumBrowser.Filter.ClearFilter")}
    </button>
</div>

<style lang="scss">
    div.clear-filter {
        display: flex;
        justify-content: flex-end;

        button {
            line-height: 1.5em;
            width: fit-content;
        }
    }
</style>
