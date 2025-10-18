<script lang="ts">
    import { slide } from "svelte/transition";
    import FilterContainer from "./filter-container.svelte";
    import type { CheckboxData } from "../../tabs/data.ts";

    const { checkbox = $bindable(), searchable }: { checkbox: CheckboxData; searchable?: boolean } = $props();
    let searchTerm = $state("");

    function onChangeCheckbox(event: Event & { currentTarget: HTMLInputElement }, value: string): void {
        const checked = event.currentTarget.checked;
        if (checked) {
            checkbox.selected.push(value);
        } else {
            checkbox.selected = checkbox.selected.filter((v) => v !== value);
        }
    }

    const onSearchSource = fu.debounce((event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        searchTerm = event.target.value.trim().toLocaleLowerCase(game.i18n.lang);
    }, 250);
</script>

<FilterContainer
    isExpanded={checkbox.isExpanded}
    clearButton={{
        options: { visible: checkbox.selected.length > 0 },
        clear: () => (checkbox.selected.length = 0),
    }}
    label={checkbox.label}
>
    <div class="checkbox-container" transition:slide>
        {#if searchable}
            <input
                type="search"
                class="filter-sources"
                spellcheck="false"
                placeholder={game.i18n.localize("PF2E.CompendiumBrowser.Filter.FilterSources")}
                oninput={onSearchSource}
            />
        {/if}
        {#each checkbox.options as option}
            {#if !searchable || !searchTerm || checkbox.selected.includes(option.value) || option.label
                    .toLocaleLowerCase(game.i18n.lang)
                    .includes(searchTerm)}
                <label>
                    <input
                        type="checkbox"
                        checked={checkbox.selected.includes(option.value)}
                        onchange={(event) => onChangeCheckbox(event, option.value)}
                    />
                    {game.i18n.localize(option.label)}
                </label>
            {/if}
        {/each}
    </div>
</FilterContainer>

<style lang="scss">
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
</style>
