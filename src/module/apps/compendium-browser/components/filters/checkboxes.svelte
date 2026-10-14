<script lang="ts">
    import * as R from "remeda";
    import { slide } from "svelte/transition";
    import type { CheckboxData, CheckboxOption } from "../../tabs/data.ts";

    const { checkbox = $bindable(), searchable }: { checkbox: CheckboxData; searchable?: boolean } = $props();
    let searchTerm = $state("");
    // The toggle is enabled if an option it substitutes is selected
    const toggleEnabled = $derived(checkbox.selected.some((s) => !!checkbox.toggle?.substitutions[s]));

    function onChangeCheckbox(
        event: Event & { currentTarget: HTMLInputElement },
        data: { name: string; option: CheckboxOption },
    ): void {
        const checked = event.currentTarget.checked;
        if (checked) {
            checkbox.selected.push(data.name);
        } else {
            checkbox.selected = checkbox.selected.filter((name) => name !== data.name);
            if (checkbox.toggle && !toggleEnabled) checkbox.toggle.active = false;
        }
        data.option.selected = checked;
    }

    const onSearchSource = fu.debounce((event: Event) => {
        if (!(event.target && fu.isElementInstanceOf(event.target, HTMLInputElement))) return;
        searchTerm = event.target.value.trim().toLocaleLowerCase(game.i18n.lang);
    }, 250);
</script>

<div class="checkbox-container" transition:slide>
    {#if searchable}
        <input
            type="search"
            class="filter-sources"
            spellcheck="false"
            placeholder={_loc("PF2E.CompendiumBrowser.Filter.FilterSources")}
            aria-label={_loc("PF2E.CompendiumBrowser.Filter.FilterSources")}
            oninput={onSearchSource}
        />
    {/if}
    {#if checkbox.toggle}
        <label class="filter-toggle">
            <input
                type="checkbox"
                class="sr-only"
                role="switch"
                disabled={!toggleEnabled}
                bind:checked={checkbox.toggle.active}
            />
            <i
                class="fa-solid fa-fw {checkbox.toggle.active ? 'fa-toggle-on' : 'fa-toggle-off'}"
                aria-hidden="true"
            ></i>
            {_loc(checkbox.toggle.label)}
        </label>
    {/if}
    {#each R.entries(checkbox.options) as [name, option] (name)}
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
                {_loc(option.label)}
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
            gap: var(--space-4);
        }

        label.filter-toggle {
            margin-left: var(--space-2);
            margin-bottom: var(--space-2);
            cursor: pointer;

            i {
                font-size: 1.25em;
                color: var(--color-text-secondary);
            }

            &:has(input:disabled) {
                opacity: 0.5;
                cursor: default;
            }
        }

        .filter-sources {
            margin: 0.3em 0.15em 0.15em 0.25em;
            height: 1.75em;
            width: 98%;
        }
    }
</style>
