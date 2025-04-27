<script lang="ts">
    import * as R from "remeda";
    import FilterContainer from "./filters/filter-container.svelte";
    import Traits from "./filters/traits.svelte";
    import Level from "./filters/level.svelte";
    import Ranges from "./filters/ranges.svelte";
    import Checkboxes from "./filters/checkboxes.svelte";
    import type { BrowserFilter, CheckboxData, LevelData, RangesInputData } from "../tabs/data.ts";

    interface FilterProps {
        filter: BrowserFilter;
        resetFilters: () => void;
    }
    const { filter = $bindable(), resetFilters }: FilterProps = $props();

    function onChangeSortOrder(): void {
        filter.order.direction = filter.order.direction === "asc" ? "desc" : "asc";
    }

    function onChangeSortValue(event: Event & { currentTarget: HTMLSelectElement }): void {
        const value = event.currentTarget.value;
        if (!value) return;
        const data = filter.order.options[value];
        if (!data) return;
        filter.order.type = data.type;
        filter.order.direction = "asc";
    }

    function getClearFunction(
        data: CheckboxData | RangesInputData | LevelData,
        options?: { name?: string },
    ): () => void {
        return () => {
            if ("selected" in data) {
                for (const opt of data.selected) {
                    data.options[opt].selected = false;
                }
                data.selected = [];
            } else if ("from" in data) {
                data.from = data.min;
                data.to = data.max;
                data.changed = false;
            } else if ("values" in data && options?.name) {
                const activeTab = game.pf2e.compendiumBrowser.activeTab;
                if (!activeTab) return;
                data.values = activeTab.parseRangeFilterInput(options.name, data.defaultMin, data.defaultMax);
                data.changed = false;
            }
        };
    }

    const onSearch = fu.debounce((event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        filter.search.text = event.target.value.trim();
    }, 250);
</script>

<div class="control-area">
    <div class="headercontainer">
        <input
            name="textFilter"
            type="search"
            value={filter.search.text}
            oninput={onSearch}
            autocomplete="off"
            spellcheck="false"
            placeholder={game.i18n.localize("PF2E.CompendiumBrowser.Filter.SearchPlaceholder")}
        />
        <div class="order-by-select">
            <label id="sort-order">
                {game.i18n.localize("PF2E.CompendiumBrowser.Filter.OrderByLabel")}:
                <div class="select-container">
                    <select bind:value={filter.order.by} onchange={onChangeSortValue}>
                        {#each R.entries(filter.order.options) as [key, data]}
                            <option value={key}>{game.i18n.localize(data.label)}</option>
                        {/each}
                    </select>
                    <button onclick={onChangeSortOrder} aria-labelledby="sort-order" type="button" class="order-button">
                        {#if filter.order.direction === "asc"}
                            <i class="fa-solid fa-sort-{filter.order.type}-up"></i>
                        {:else}
                            <i class="fa-solid fa-sort-{filter.order.type}-down-alt"></i>
                        {/if}
                    </button>
                </div>
            </label>
            {#if "selects" in filter}
                {#each R.entries(filter.selects) as [key, data]}
                    <label>
                        {game.i18n.localize(data.label)}:
                        <div class="select-container">
                            <select bind:value={filter.selects[key].selected} data-key={key}>
                                <option value="">-</option>
                                {#each R.entries(data.options) as [key, label]}
                                    <option value={key}>{game.i18n.localize(label)}</option>
                                {/each}
                            </select>
                        </div>
                    </label>
                {/each}
            {/if}
        </div>
        <button type="button" class="clear-filters" onclick={() => resetFilters()}>
            {game.i18n.localize("PF2E.CompendiumBrowser.Filter.ClearAllFilters")}
        </button>
    </div>
    <FilterContainer label="PF2E.Traits">
        <Traits bind:traits={filter.traits} />
    </FilterContainer>
    {#each Object.entries(filter.checkboxes) as [key, checkbox]}
        <FilterContainer
            isExpanded={checkbox.isExpanded}
            clearButton={{
                options: { visible: checkbox.selected.length > 0 },
                clear: getClearFunction(checkbox),
            }}
            label={checkbox.label}
        >
            <Checkboxes bind:checkbox={filter.checkboxes[key as keyof BrowserFilter["checkboxes"]]} />
        </FilterContainer>
    {/each}
    {#if filter.source}
        <FilterContainer
            isExpanded={filter.source.isExpanded}
            clearButton={{
                options: { visible: filter.source.selected.length > 0 },
                clear: getClearFunction(filter.source),
            }}
            label="PF2E.CompendiumBrowser.Filter.Source"
        >
            <Checkboxes bind:checkbox={filter.source} searchable />
        </FilterContainer>
    {/if}
    {#if "ranges" in filter}
        {#each R.entries(filter.ranges) as [name, range]}
            <FilterContainer
                isExpanded={range.isExpanded}
                clearButton={{ options: { visible: range.changed }, clear: getClearFunction(range, { name }) }}
                label={range.label}
            >
                <Ranges bind:range={filter.ranges[name]} {name} />
            </FilterContainer>
        {/each}
    {/if}
    {#if "level" in filter}
        <FilterContainer
            isExpanded={filter.level.isExpanded}
            clearButton={{
                options: { visible: filter.level.changed },
                clear: getClearFunction(filter.level),
            }}
            label="PF2E.CompendiumBrowser.Filter.Levels"
        >
            <Level bind:level={filter.level} />
        </FilterContainer>
    {/if}
</div>

<style lang="scss">
    .control-area {
        overflow-y: auto;
        padding-right: var(--space-4);
        scrollbar-gutter: stable;
    }

    .headercontainer {
        border: 1px solid #bbb;
        border-radius: 5px;
        margin-top: 5px;
        padding: var(--space-6);
        position: relative;

        .order-by-select {
            margin-top: 0.6em;

            label {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin: 0 0 0.6em 1em;
            }
        }

        .select-container {
            margin-right: 1em;

            select {
                width: fit-content;
                height: 2em;
            }

            .order-button {
                display: inline-flex;
                border: unset;
                background: unset;
                width: 2em;
                height: 2em;

                &:hover {
                    background: var(--button-hover-background-color);
                }

                i {
                    margin-right: unset;
                }
            }
        }

        .clear-filters {
            width: 100%;
        }
    }
</style>
