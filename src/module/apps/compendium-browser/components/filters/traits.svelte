<script lang="ts">
    import TraitsSelect from "./partials/traits-select.svelte";
    import { htmlQuery, htmlClosest } from "@util";
    import type { TraitData } from "../../tabs/data.ts";
    import type { Action } from "svelte/action";

    type TraitOption = TraitData["options"][number];

    interface Props {
        traits: TraitData;
    }
    const props: Props = $props();
    const traits = props.traits;
    const browser = game.pf2e.compendiumBrowser;

    function onChangeConjunction(event: Event & { currentTarget: HTMLInputElement }): void {
        const value = event.currentTarget.value;
        if (value !== "and" && value !== "or") return;
        traits.conjunction = value;
        browser.renderParts("resultList");
    }

    function onChangeTraits(selected: TraitOption[]): void {
        traits.selected = selected;
        browser.renderParts("resultList");
    }

    function onClickNot(event: MouseEvent, index: number): void {
        const selected = traits.selected.at(index);
        if (!selected) return;
        selected.not = !selected.not;

        const element = htmlQuery(htmlClosest(event.currentTarget, ".sv-item--container"), ".sv-item--content");
        if (selected.not) {
            element?.classList.add("not");
        } else {
            element?.classList.remove("not");
        }

        browser.renderParts("resultList");
    }
</script>

<TraitsSelect
    options={traits.options}
    multiple
    closeAfterSelect
    clearable
    creatable={false}
    selection={traitSelection}
    onChange={onChangeTraits}
    placeholder={game.i18n.localize("PF2E.SelectLabel")}
    value={traits.selected.map((s) => s.value)}
/>
<div class="filter-conjunction">
    <label>
        <input
            type="radio"
            name="filter-conjunction-and"
            value="and"
            checked={traits.conjunction === "and"}
            onchange={onChangeConjunction}
        />
        {game.i18n.localize("PF2E.CompendiumBrowser.Filter.Conjunction.AndLabel")}
    </label>
    <label>
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

{#snippet traitSelection(options: TraitOption[], itemAction: Action<HTMLElement, TraitOption>)}
    {#each options as opt, index (opt.value)}
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
                onclick={(event) => onClickNot(event, index)}
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
    :global(.sv-item--content) {
        &.not {
            text-decoration: line-through;
        }
    }

    .sv-item--btn {
        min-width: 16px;

        i {
            margin-right: unset;
            color: var(--color-text-trait);
        }
    }

    .filter-conjunction {
        display: flex;

        input[type="radio"] {
            margin: 0 5px 0 3px;
        }
    }
</style>
