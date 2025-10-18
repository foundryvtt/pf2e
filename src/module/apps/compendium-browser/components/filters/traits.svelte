<script lang="ts">
    import { onMount } from "svelte";
    import type { Action } from "svelte/action";
    import { SvelteSet } from "svelte/reactivity";
    import FilterContainer from "./filter-container.svelte";
    import TraitsSelect from "./partials/traits-select.svelte";
    import type { TraitData } from "../../tabs/data.ts";

    type TraitOption = TraitData["options"][number];

    interface Props {
        traits: TraitData;
    }
    const { traits = $bindable() }: Props = $props();
    const exclude = new SvelteSet<string>();

    function onChangeConjunction(event: Event & { currentTarget: HTMLInputElement }): void {
        const value = event.currentTarget.value;
        if (value !== "and" && value !== "or") return;
        traits.conjunction = value;
    }

    function onChangeTraits(newSelection: TraitOption[]): void {
        // Keep the original value, if available, to not lose the "not" state
        traits.selected = newSelection.map((n) => traits.selected.find((s) => s.value === n.value) ?? n);
    }

    function onClickNot(index: number): void {
        const selected = traits.selected.at(index);
        if (!selected) return;
        selected.not = !selected.not;

        if (selected.not) {
            exclude.add(selected.value);
        } else {
            exclude.delete(selected.value);
        }
    }

    onMount(() => {
        for (const selected of traits.selected) {
            if (selected.not) {
                exclude.add(selected.value);
            }
        }
    });
</script>

<FilterContainer label="PF2E.Traits" notExpandable={true}>
    <TraitsSelect
        options={traits.options}
        multiple
        closeAfterSelect
        clearable
        creatable={false}
        selection={traitSelection}
        onChange={onChangeTraits}
        placeholder={game.i18n.localize("PF2E.SelectLabel")}
        value={traits.selected.map((t) => t.value)}
    />
    <div class="filter-conjunction">
        <label class="checkbox">
            <input
                type="radio"
                name="filter-conjunction-and"
                value="and"
                checked={traits.conjunction === "and"}
                onchange={onChangeConjunction}
            />
            {game.i18n.localize("PF2E.CompendiumBrowser.Filter.Conjunction.AndLabel")}
        </label>
        <label class="checkbox">
            <input
                type="radio"
                name="filter-conjunction-or"
                value="or"
                checked={traits.conjunction === "or"}
                onchange={onChangeConjunction}
            />
            {game.i18n.localize("PF2E.CompendiumBrowser.Filter.Conjunction.OrLabel")}
        </label>
    </div>
</FilterContainer>

{#snippet traitSelection(options: TraitOption[], itemAction: Action<HTMLElement, TraitOption>)}
    {#each options as opt, index (opt.value)}
        <div class="sv-item--container">
            <div class="sv-item--wrap in-selection is-multi">
                <div class="sv-item--content" class:not={exclude.has(opt.value)}>{opt.label}</div>
            </div>
            <button
                class="sv-item--btn"
                tabindex="-1"
                type="button"
                aria-label="not option"
                data-action="not"
                onclick={() => onClickNot(index)}
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
                onclick={() => exclude.delete(opt.value)}
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
    :global(.sv-item--content) {
        &.not {
            text-decoration: line-through;
        }
    }

    .sv-item--btn {
        min-height: unset;
        height: unset;
        min-width: 11px;

        i {
            margin-right: unset;
            color: var(--color-text-trait);
        }
    }

    .filter-conjunction {
        display: flex;

        input[type="radio"] {
            margin-top: 0;
        }
    }
</style>
