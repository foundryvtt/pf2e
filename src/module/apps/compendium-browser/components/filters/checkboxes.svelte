<script lang="ts">
    import * as R from "remeda";
    import { slide } from "svelte/transition";
    import type { CheckboxData, CheckboxOption } from "../../tabs/data.ts";

    const { checkbox = $bindable(), searchable }: { checkbox: CheckboxData; searchable?: boolean } = $props();
    let searchTerm = $state("");

    function onChangeCheckbox(
        event: Event & { currentTarget: HTMLInputElement },
        data: { name: string; option: CheckboxOption },
    ): void {
        const checked = event.currentTarget.checked;
        if (checked) {
            checkbox.selected.push(data.name);
        } else {
            checkbox.selected = checkbox.selected.filter((name) => name !== data.name);
        }
        data.option.selected = checked;
    }

    const onSearchSource = fu.debounce((event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        searchTerm = event.target.value.trim().toLocaleLowerCase(game.i18n.lang);
    }, 250);
</script>

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
    {#each R.entries(checkbox.options) as [name, option]}
        {#if !searchable || !searchTerm || option.selected || option.label
                .toLocaleLowerCase(game.i18n.lang)
                .includes(searchTerm)}
            <label>
                <input
                    type="checkbox"
                    {name}
                    checked={option.selected}
                    onchange={(event) => onChangeCheckbox(event, { name, option })}
                />
                {game.i18n.localize(option.label)}
            </label>
        {/if}
    {/each}
</div>

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
