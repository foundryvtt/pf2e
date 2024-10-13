<script lang="ts">
    import * as R from "remeda";
    import { slide } from "svelte/transition";
    import { htmlClosest } from "@util/dom.ts";
    import Tagify from "@yaireo/tagify";
    import type { Action } from "svelte/action";
    import type { BrowserFilter, CheckboxData, CheckboxOption, LevelData, RangesInputData } from "../tabs/data.ts";

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

    const mountTagify: Action<HTMLInputElement> = (node) => {
        const data = filter.traits;

        const tagify = new Tagify(node, {
            enforceWhitelist: true,
            keepInvalidTags: false,
            editTags: false,
            tagTextProp: "label",
            dropdown: {
                enabled: 0,
                fuzzySearch: false,
                mapValueTo: "label",
                maxItems: data.options.length,
                searchKeys: ["label"],
            },
            whitelist: data.options,
            transformTag(tagData) {
                const selected = data.selected.find((s) => s.value === tagData.value);
                if (selected?.not) {
                    (tagData as unknown as { class: string }).class = "conjunction-not";
                }
            },
            templates: {
                tag(tagData, _tagify) {
                    return `<tag title="${tagData.value}"
                            contenteditable="false"
                            spellcheck="false"
                            tabIndex="${this.settings.a11y.focusableTags ? 0 : -1}"
                            class="${this.settings.classNames.tag} ${"class" in tagData ? tagData.class : ""}"
                            ${this.getAttributes(tagData)}
                        >
                        <x title="" class="${this.settings.classNames.tagX}" role="button" aria-label="remove tag"></x>
                        <div>
                            <span class="${this.settings.classNames.tagText}">${tagData.value}</span>
                        </div>
                        <a class="conjunction-not-button" data-action="toggle-not"><i class="fa-solid fa-ban fa-2xs"></i></a>
                    </tag>`;
                },
            },
        });

        tagify.on("click", (event) => {
            const target = event.detail.event.target;
            if (!(target instanceof HTMLElement)) return;
            const action = htmlClosest(target, "[data-action]")?.dataset?.action;
            if (action === "toggle-not") {
                const value = event.detail.data.value;
                const selected = data.selected.find((s) => s.value === value);
                if (selected) {
                    selected.not = !selected.not;
                    rerenderList();
                }
            }
        });
        tagify.on("change", (event) => {
            const selections: unknown = JSON.parse(event.detail.value || "[]");
            const isValid =
                Array.isArray(selections) &&
                selections.every(
                    (s: object | undefined): s is { value: string; label: string } =>
                        typeof s === "object" && "value" in s && typeof s["value"] === "string",
                );

            if (isValid) {
                data.selected = selections;
                rerenderList();
            }
        });

        return {
            destroy() {
                tagify.destroy();
            },
        };
    };
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
        <input
            class="tags paizo-style"
            name="trait-tags"
            value={JSON.stringify(filter.traits.selected)}
            use:mountTagify
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
    }
</style>
