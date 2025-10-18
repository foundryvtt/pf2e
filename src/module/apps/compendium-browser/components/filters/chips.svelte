<script lang="ts">
    import { slide } from "svelte/transition";
    import type { ChipsData, LabeledValue } from "../../tabs/data.ts";
    import FilterContainer from "./filter-container.svelte";

    interface Props {
        chipsKey: string;
        chips: ChipsData;
    }
    const { chips = $bindable(), chipsKey }: Props = $props();

    function onClickChips(event: MouseEvent, option: LabeledValue): void {
        const selected = chips.selected.find((s) => s.value === option.value);
        if (event.button === 0) {
            if (selected) {
                if (selected.exclude) {
                    chips.selected.findSplice((s) => s.value === selected.value);
                } else {
                    selected.exclude = true;
                }
            } else {
                chips.selected.push({ value: option.value, exclude: event.shiftKey });
            }
        } else if (event.button === 2 && selected) {
            chips.selected.findSplice((s) => s.value === selected.value);
        }
    }

    function onChangeConjunction(event: Event & { currentTarget: HTMLInputElement }): void {
        const value = event.currentTarget.value;
        if (value !== "and" && value !== "or") return;
        chips.conjunction = value;
    }

    function clear(): void {
        chips.selected.length = 0;
        const defaultFilter = game.pf2e.compendiumBrowser.activeTab.defaultFilterData;
        const defaultValue = fu.getProperty(defaultFilter, `chips.${chipsKey}.conjunction`) as "and" | "or" | undefined;
        if (!defaultValue)
            return console.error(`Failed to retrieve default conjunction value for chips filter: ${chipsKey}!`);
        chips.conjunction = defaultValue;
    }
</script>

<FilterContainer
    bind:isExpanded={chips.isExpanded}
    clearButton={{
        options: { visible: chips.selected.length > 0 },
        clear,
    }}
    label={chips.label}
>
    <div transition:slide>
        <div class="chips">
            {#each chips.options as option}
                {@const selected = chips.selected.find((s) => s.value === option.value)}
                {@const exclude = !!selected?.exclude}
                <button
                    class="chip"
                    onclick={(event) => onClickChips(event, option)}
                    oncontextmenu={(event) => onClickChips(event, option)}
                >
                    {#if exclude}
                        <i class="fa-solid fa-duotone fa-circle-xmark fa-lg active" class:exclude></i>
                    {:else}
                        <i class="fa-solid fa-duotone fa-circle-check fa-lg" class:active={!!selected}></i>
                    {/if}
                    {option.label}
                </button>
            {/each}
        </div>
        {#if chips.showConjunction}
            <div class="filter-conjunction">
                <label class="checkbox">
                    <input
                        type="radio"
                        value="and"
                        checked={chips.conjunction === "and"}
                        onchange={onChangeConjunction}
                    />
                    {game.i18n.localize("PF2E.CompendiumBrowser.Filter.Conjunction.AndLabel")}
                </label>
                <label class="checkbox">
                    <input
                        type="radio"
                        value="or"
                        checked={chips.conjunction === "or"}
                        onchange={onChangeConjunction}
                    />
                    {game.i18n.localize("PF2E.CompendiumBrowser.Filter.Conjunction.OrLabel")}
                </label>
            </div>
        {/if}
    </div>
</FilterContainer>

<style lang="scss">
    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.35rem;

        .chip {
            font-size: var(--font-size-14);
            border-radius: 999px;
            gap: 0.35rem;

            i {
                --fa-secondary-opacity: 1;

                &.active {
                    --fa-secondary-color: #009988;
                }

                &:not(.active) {
                    --fa-primary-opacity: 0.5;
                    --fa-secondary-opacity: 0;
                }

                &.exclude {
                    --fa-secondary-color: #cc3311;
                }
            }
        }
    }

    .filter-conjunction {
        display: flex;
    }
</style>
