<script lang="ts">
    import * as R from "remeda";
    import Traits from "./traits/traits.svelte";
    import { slide } from "svelte/transition";
    import type { Action } from "svelte/action";
    import type { BrowserFilter, CheckboxData, CheckboxOption, LevelData, RangesInputData } from "../tabs/data.ts";
    import type { TraitOption } from "./traits/types.ts";
    import { htmlClosest, htmlQuery } from "@util";

    interface FilterProps {
        filter: BrowserFilter;
        rerenderList: () => void;
        resetFilters: () => void;
    }
    const { filter = $bindable(), rerenderList, resetFilters }: FilterProps = $props();
    let sourceSearch = $state("");

    function onChangeSortOrder(): void {
        filter.order.direction = filter.order.direction === "asc" ? "desc" : "asc";
        rerenderList();
    }

    function onChangeSortValue(event: Event & { currentTarget: HTMLSelectElement }): void {
        const value = event.currentTarget.value;
        if (!value) return;
        const data = filter.order.options[value];
        if (!data) return;
        filter.order.type = data.type;
        filter.order.direction = "asc";
        rerenderList();
    }

    function onChangeConjunction(event: Event & { currentTarget: HTMLInputElement }): void {
        const value = event.currentTarget.value;
        if (value !== "and" && value !== "or") return;
        filter.traits.conjunction = value;
        rerenderList();
    }

    function onChangeCheckbox(
        event: Event & { currentTarget: HTMLInputElement },
        checkbox: CheckboxData,
        data: { name: string; option: CheckboxOption },
    ): void {
        const checked = event.currentTarget.checked;
        if (checked) {
            checkbox.selected.push(data.name);
        } else {
            checkbox.selected = checkbox.selected.filter((name) => name !== data.name);
        }
        data.option.selected = checked;
        rerenderList();
    }

    function onChangeRange(
        event: Event & { currentTarget: HTMLInputElement },
        name: string,
        range: RangesInputData,
    ): void {
        const activeTab = game.pf2e.compendiumBrowser.activeTab;
        if (!activeTab) return;
        const elName = event.currentTarget.name;
        const elValue = event.currentTarget.value;
        if (elName === "lowerBound") {
            range.values = activeTab.parseRangeFilterInput(name, elValue, range.values.inputMax);
        } else if (elName === "upperBound") {
            range.values = activeTab.parseRangeFilterInput(name, range.values.inputMin, elValue);
        }
        range.changed = true;
        rerenderList();
    }

    function onChangeLevel(event: Event & { currentTarget: HTMLSelectElement }, level: LevelData): void {
        const name = event.currentTarget.name;
        const value = Math.clamp(Number(event.currentTarget.value), level.min, level.max);
        if (name === "from") {
            if (value > level.to) {
                level.to = value;
            }
            level.from = value;
        } else if (name === "to") {
            if (value < level.from) {
                level.from = value;
            }
            level.to = value;
        }
        level.changed = level.from !== level.min || level.to !== level.max;
        rerenderList();
    }

    function onClearAllFilters(): void {
        resetFilters();
        rerenderList();
    }

    function onClearFilter(data: CheckboxData | RangesInputData | LevelData, name?: string): void {
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
        rerenderList();
    }

    function onChangeTraits(selected: TraitOption[]): void {
        filter.traits.selected = selected;
        rerenderList();
    }

    function onClickNot(event: MouseEvent, clicked: TraitOption): void {
        const selected = filter.traits.selected.find((o) => o.value === clicked.value);
        if (!selected) return;
        selected.not = !selected.not;

        const element = htmlQuery(htmlClosest(event.currentTarget, ".sv-item--container"), ".sv-item--content");
        if (selected.not) {
            element?.classList.add("not");
        } else {
            element?.classList.remove("not");
        }

        rerenderList();
    }

    const onSearch = fu.debounce((event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        filter.search.text = event.target.value.trim();
        rerenderList();
    }, 250);

    const onSearchSource = fu.debounce((event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        sourceSearch = event.target.value.trim().toLocaleLowerCase(game.i18n.lang);
        rerenderList();
    }, 250);
</script>

<div class="control-area">
    <div class="sortcontainer">
        <input
            name="textFilter"
            type="search"
            value={filter.search.text}
            oninput={onSearch}
            spellcheck="false"
            placeholder={game.i18n.localize("PF2E.CompendiumBrowser.Filter.SearchPlaceholder")}
        />
        <div class="order-by-select">
            <label id="sort-order">
                {game.i18n.localize("PF2E.CompendiumBrowser.Filter.OrderByLabel")}:
                <div class="select-container">
                    <select bind:value={filter.order.by} onchange={onChangeSortValue}>
                        {#each Object.entries(filter.order.options) as [key, data]}
                            <option value={key}>{game.i18n.localize(data.label)}</option>
                        {/each}
                    </select>
                    <button onclick={onChangeSortOrder} aria-labelledby="sort-order" type="button" class="order-button">
                        {#if filter.order.type === "alpha"}
                            {#if filter.order.direction === "asc"}
                                <i class="fa-solid fa-sort-alpha-up"></i>
                            {:else}
                                <i class="fa-solid fa-sort-alpha-down-alt"></i>
                            {/if}
                        {:else if filter.order.type === "numeric"}
                            {#if filter.order.direction === "asc"}
                                <i class="fa-solid fa-sort-numeric-up"></i>
                            {:else}
                                <i class="fa-solid fa-sort-numeric-down-alt"></i>
                            {/if}
                        {/if}
                    </button>
                </div>
            </label>
            {#if "selects" in filter}
                {#each R.entries(filter.selects) as [key, data]}
                    <label>
                        {game.i18n.localize(data.label)}:
                        <div class="select-container">
                            <select bind:value={filter.selects[key].selected} onchange={rerenderList} data-key={key}>
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
        <button type="button" class="clear-filters" onclick={onClearAllFilters}>
            {game.i18n.localize("PF2E.CompendiumBrowser.Filter.ClearAllFilters")}
        </button>
    </div>
    <fieldset class="sortcontainer">
        <legend>{game.i18n.localize("PF2E.Traits")}</legend>
        <Traits
            options={filter.traits.options}
            multiple
            closeAfterSelect
            clearable
            creatable={false}
            selection={traits}
            onChange={onChangeTraits}
            placeholder={game.i18n.localize("PF2E.SelectLabel")}
            value={filter.traits.selected.map((s) => s.value)}
        />
        <div class="filter-conjunction">
            <label>
                <input
                    type="radio"
                    name="filter-conjunction-and"
                    value="and"
                    checked={filter.traits.conjunction === "and"}
                    onchange={onChangeConjunction}
                />
                {game.i18n.localize("PF2E.CompendiumBrowser.Filter.Conjunction.AndLabel")}
            </label>
            <label>
                <input
                    type="radio"
                    name="filter-conjunction-or"
                    value="or"
                    checked={filter.traits.conjunction === "or"}
                    onchange={onChangeConjunction}
                />
                {game.i18n.localize("PF2E.CompendiumBrowser.Filter.Conjunction.OrLabel")}
            </label>
        </div>
    </fieldset>
    {#each R.values(filter.checkboxes) as checkbox}
        <fieldset class="sortcontainer">
            <legend>
                {@render expandFilterButton(checkbox, checkbox.label)}
            </legend>
            {#if checkbox.isExpanded}
                <div class="checkbox-container" transition:slide>
                    {@render clearFilterButton(checkbox, { enabled: checkbox.selected.length > 0 })}
                    {#each R.entries(checkbox.options) as [name, option]}
                        <label>
                            <input
                                type="checkbox"
                                {name}
                                checked={option.selected}
                                onchange={(event) => onChangeCheckbox(event, checkbox, { name, option })}
                            />
                            {game.i18n.localize(option.label)}
                        </label>
                    {/each}
                </div>
            {/if}
        </fieldset>
    {/each}
    {#if filter.source}
        <fieldset class="sortcontainer">
            <legend>
                {@render expandFilterButton(filter.source, "PF2E.CompendiumBrowser.Filter.Source")}
            </legend>
            {#if filter.source.isExpanded}
                {@render clearFilterButton(filter.source, { enabled: filter.source.selected.length > 0 })}
                <div class="checkbox-container" transition:slide>
                    <input
                        type="search"
                        class="filter-sources"
                        spellcheck="false"
                        placeholder={game.i18n.localize("PF2E.CompendiumBrowser.Filter.FilterSources")}
                        oninput={onSearchSource}
                    />
                    {#each R.entries(filter.source.options) as [name, option]}
                        {#if !sourceSearch || option.selected || option.label
                                .toLocaleLowerCase(game.i18n.lang)
                                .includes(sourceSearch)}
                            <label>
                                <input
                                    type="checkbox"
                                    {name}
                                    checked={option.selected}
                                    onchange={(event) => onChangeCheckbox(event, filter.source, { name, option })}
                                />
                                {game.i18n.localize(option.label)}
                            </label>
                        {/if}
                    {/each}
                </div>
            {/if}
        </fieldset>
    {/if}
    {#if "ranges" in filter}
        {#each R.entries(filter.ranges) as [name, range]}
            <fieldset class="sortcontainer">
                <legend>
                    {@render expandFilterButton(range, range.label)}
                </legend>
                {#if range.isExpanded}
                    <div class="ranges-container" transition:slide>
                        {@render clearFilterButton(range, { enabled: range.changed, name })}
                        <div class="inputs">
                            <input
                                type="text"
                                autocomplete="off"
                                name="lowerBound"
                                placeholder={range.defaultMin}
                                bind:value={range.values.inputMin}
                                onchange={(event) => onChangeRange(event, name, range)}
                            />
                            -
                            <input
                                type="text"
                                autocomplete="off"
                                name="upperBound"
                                placeholder={range.defaultMax}
                                bind:value={range.values.inputMax}
                                onchange={(event) => onChangeRange(event, name, range)}
                            />
                        </div>
                    </div>
                {/if}
            </fieldset>
        {/each}
    {/if}
    {#if "level" in filter}
        <fieldset class="sortcontainer">
            <legend>
                {@render expandFilterButton(filter.level, "PF2E.CompendiumBrowser.Filter.Levels")}
            </legend>
            {#if filter.level.isExpanded}
                <div class="levels-container" transition:slide>
                    {@render clearFilterButton(filter.level, { enabled: filter.level.changed })}
                    <div class="inputs">
                        <select
                            name="from"
                            value={filter.level.from}
                            onchange={(event) => onChangeLevel(event, filter.level)}
                        >
                            {#each R.range(filter.level.min, filter.level.max + 1) as level}
                                <option value={level}>{level}</option>
                            {/each}
                        </select>
                        -
                        <select
                            name="to"
                            value={filter.level.to}
                            onchange={(event) => onChangeLevel(event, filter.level)}
                        >
                            {#each R.range(filter.level.min, filter.level.max + 1) as level}
                                <option value={level}>{level}</option>
                            {/each}
                        </select>
                    </div>
                </div>
            {/if}
        </fieldset>
    {/if}
</div>

{#snippet expandFilterButton(data: CheckboxData | RangesInputData | LevelData, label = "")}
    <button
        type="button"
        class="expand-section"
        onclick={() => (data.isExpanded = !data.isExpanded)}
        aria-label="expand"
        aria-expanded={data.isExpanded}
    >
        {game.i18n.localize(label)}
        <i class="fa-solid {data.isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
    </button>
{/snippet}

{#snippet clearFilterButton(
    data: CheckboxData | RangesInputData | LevelData,
    options: { enabled: boolean; name?: string },
)}
    <div class="clear-filter">
        <button type="button" disabled={!options.enabled} onclick={() => onClearFilter(data, options.name)}>
            {game.i18n.localize("PF2E.CompendiumBrowser.Filter.ClearFilter")}
        </button>
    </div>
{/snippet}

{#snippet traits(options: TraitOption[], itemAction: Action<HTMLElement, TraitOption>)}
    {#each options as opt (opt.value)}
        <div class="sv-item--container">
            <div class="sv-item--wrap in-selection is-multi">
                <div class="sv-item--content">{opt.label}</div>
            </div>
            <button
                class="sv-item--btn"
                tabindex="-1"
                type="button"
                aria-label="not option"
                data-action="not"
                onclick={(event) => onClickNot(event, opt)}
            >
                <i class="fa-solid fa-ban fa-2xs"></i>
            </button>
            <button
                class="sv-item--btn"
                tabindex="-1"
                type="button"
                aria-label="deslect"
                data-action="deselect"
                use:itemAction={opt}
            >
                <svg height="16" width="16" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                        d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z"
                    ></path>
                </svg>
            </button>
        </div>
    {/each}
{/snippet}

<style lang="scss">
    .control-area {
        overflow-y: auto;
    }

    .sortcontainer {
        border: 1px solid #bbb;
        border-radius: 5px;
        margin-top: 5px;
        padding: 2px;
        position: relative;

        legend {
            display: flex;
            font-size: 1.25em;
            margin-bottom: var(--space-2);

            button.expand-section {
                border: unset;
                background: unset;
                padding: var(--space-2);
                width: fit-content;
                height: 1.5em;
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

        div.clear-filter {
            display: flex;
            justify-content: flex-end;

            button {
                line-height: 1.5em;
                width: fit-content;
            }
        }

        .filter-conjunction {
            display: flex;

            input[type="radio"] {
                margin: 0 5px 0 3px;
            }
        }

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

        .checkbox-container {
            display: flex;
            flex-direction: column;

            label {
                display: flex;
                align-items: center;
            }

            .filter-sources {
                margin: 0.3em 0.15em 0.15em 0.25em;
                height: 1.75em;
                width: 98%;
            }
        }

        .levels-container,
        .ranges-container {
            display: flex;
            flex-direction: column;

            .inputs {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 0.5em;

                input,
                select {
                    width: 45%;
                }
            }
        }

        .sv-item--content.not {
            text-decoration: line-through;
        }

        .sv-item--btn {
            min-width: 16px;

            i {
                margin-right: unset;
                color: var(--color-text-trait);
            }
        }
    }
</style>
