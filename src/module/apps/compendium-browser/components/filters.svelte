<script lang="ts">
    import * as R from "remeda";
    import Traits from "./filters/traits.svelte";
    import Level from "./filters/level.svelte";
    import Ranges from "./filters/ranges.svelte";
    import Checkboxes from "./filters/checkboxes.svelte";
    import Chips from "./filters/chips.svelte";
    import type { BrowserFilter, ChipsData } from "../tabs/data.ts";

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
                                {#each data.options as option}
                                    <option value={option.value}>{game.i18n.localize(option.label)}</option>
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
    <Traits bind:traits={filter.traits} />
    {#if "chips" in filter}
        {@const chips: Record<string, ChipsData> = filter.chips}
        {#each R.keys(chips) as key}
            <Chips chipsKey={key} bind:chips={chips[key]} />
        {/each}
    {/if}
    {#if filter.source}
        <Checkboxes bind:checkbox={filter.source} searchable />
    {/if}
    {#if "ranges" in filter}
        {#each R.keys(filter.ranges) as name}
            <Ranges bind:range={filter.ranges[name]} {name} />
        {/each}
    {/if}
    {#if "level" in filter}
        <Level bind:level={filter.level} />
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
