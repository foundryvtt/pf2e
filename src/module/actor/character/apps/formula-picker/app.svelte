<script lang="ts">
    import type { FormulaPickerContext } from "./app.ts";
    import ItemSummary from "@module/sheet/components/item-summary.svelte";
    import ItemTraits from "@module/sheet/components/item-traits.svelte";
    import HoverIconButton from "@module/sheet/components/hover-icon-button.svelte";
    import { sendItemToChat } from "@module/sheet/helpers.ts";

    const { state: data, actor, ability, mode, searchEngine, onSelect, onDeselect }: FormulaPickerContext = $props();
    const openStates: Record<string, boolean> = $state({});
    let queryText = $state("");

    // A filtered view of the formula sections based on the search query
    const filteredSections = $derived.by(() => {
        // Search only starts once at least two characters are inserted
        if (queryText.trim().length <= 1) return data.sections;

        const results = new Set(searchEngine.search(queryText).map((r) => r.id));
        return data.sections
            .map((s) => ({
                ...s,
                formulas: s.formulas.filter((f) => results.has(f.item.id)),
            }))
            .filter((s) => s.formulas.length);
    });
</script>

<header class="sheet-header">
    <p class="hint">{data.prompt}</p>
    <div class="search">
        <input
            type="search"
            spellcheck="false"
            bind:value={queryText}
            placeholder={game.i18n.localize("PF2E.Actor.Character.Crafting.Search")}
        />
    </div>
    {#if !ability.isPrepared && !data.resource?.value}
        <p class="notification warning">{game.i18n.localize("PF2E.Actor.Character.Crafting.MissingResource")}</p>
    {/if}
</header>

<section class="content">
    {#each filteredSections as section (section.level)}
        <header>{game.i18n.format("PF2E.LevelN", { level: section.level })}</header>
        <ol class="items-list">
            {#each section.formulas as formula (formula.item.id)}
                <li
                    class="item"
                    class:selected={formula.selected}
                    class:faded={mode === "prepare" && !formula.selected}
                >
                    <HoverIconButton
                        class="item-image"
                        src={formula.item.img}
                        icon="fa-solid fa-message"
                        onclick={(event) => sendItemToChat(formula.item.uuid, { event, actor })}
                    />
                    <button
                        class="name flat"
                        data-rarity={formula.item.rarity}
                        onclick={() => (openStates[formula.item.uuid] = !openStates[formula.item.uuid])}
                    >
                        <span>{formula.item.name}</span>
                        <ItemTraits traits={formula.item.traits} rarity={formula.item.rarity} />
                    </button>
                    {#if mode === "prepare"}
                        <div class="quantity">
                            <button
                                type="button"
                                class="subtract"
                                disabled={formula.quantity === 0}
                                data-tooltip="PF2E.Actor.Character.Crafting.DecreaseQuantity"
                                aria-labelledby="tooltip"
                                onclick={() => ability.setFormulaQuantity(formula.item.uuid, "decrease")}
                            >
                                <i class="fa-solid fa-minus"></i>
                            </button>
                            <input
                                class:selected={formula.selected}
                                type="number"
                                placeholder="0"
                                value={formula.quantity || null}
                                onblur={(event) => {
                                    ability.setFormulaQuantity(
                                        formula.item.uuid,
                                        Number(event.currentTarget.value || 0),
                                    );
                                    event.currentTarget.value = String(formula.quantity || "");
                                }}
                            />
                            <button
                                type="button"
                                class="plus"
                                data-tooltip="PF2E.Actor.Character.Crafting.IncreaseQuantity"
                                aria-labelledby="tooltip"
                                onclick={() => ability.setFormulaQuantity(formula.item.uuid, "increase")}
                            >
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    {:else}
                        <button
                            type="button"
                            class="select"
                            class:selected={formula.selected}
                            onclick={() =>
                                formula.selected ? onDeselect(formula.item.uuid) : onSelect(formula.item.uuid)}
                            aria-labelledby="tooltip"
                            data-tooltip={formula.selected ? "Cancel" : "Confirm"}
                        >
                            <i class="fa-solid fa-fw fa-check"></i>
                        </button>
                    {/if}
                    <ItemSummary
                        uuid={formula.item.uuid}
                        open={!!openStates[formula.item.uuid]}
                        exclude={["traits", "price"]}
                    />
                </li>
            {/each}
        </ol>
    {/each}
</section>

<style>
    .sheet-header {
        flex-direction: column;
        margin: var(--space-8);
        margin-bottom: 0;
        .search {
            margin-top: var(--space-2);
        }
    }

    .content {
        display: flex;
        flex-direction: column;
        list-style: none;
        width: 100%;
        flex: 1;
        overflow-y: scroll;
        padding: var(--space-8) 0;
        padding-top: 0;

        header {
            border-bottom: 1px solid var(--color-border);
            margin-top: var(--space-10);
            margin-bottom: var(--space-2);
            font-weight: 500;
            font-size: var(--font-size-16);
            padding: 0 var(--space-8);
        }

        ol {
            display: flex;
            flex-direction: column;
            list-style: none;
            width: 100%;
            margin: 0;
            padding: 0;
        }
    }

    .item {
        align-items: top;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        width: 100%;
        padding: var(--space-4) var(--space-8);
        margin: 0;

        &.faded {
            > *:not(.item-summary) {
                opacity: 0.88;
            }

            > :global(.item-image img) {
                filter: grayscale(0.85);
            }
        }

        > :global(.item-image) {
            --image-size: 2.125rem;
            margin-right: var(--space-4);
            margin-top: var(--space-1); /* align with name */
        }

        > .name {
            cursor: pointer;
            flex: 1;
            margin: 0;

            &:hover {
                text-shadow: 0 0 8px var(--color-shadow-primary);
            }

            :global {
                .tags {
                    padding: 0;
                    margin: 0;
                }
                .tag {
                    /** Roboto has some inherit padding that makes sizing this small cause misalignment w/o line-height */
                    height: var(--space-17);
                    line-height: 95%;
                }
            }
        }

        > .quantity {
            --input-height: 1.375rem;

            display: flex;
            margin-top: var(--space-6);
            button {
                width: 1.375rem;
                i {
                    margin: 0;
                }
            }
            input {
                border: none;
                width: 3ch;
                padding-left: 0;
                padding-right: 0;
                text-align: center;
                &.selected {
                    font-weight: 600;
                    opacity: unset;
                    color: var();
                }
            }
        }

        > button.select {
            --button-size: 1.75rem;
            width: 1.75rem;
            margin-top: var(--space-4);
            transition: all 0.25s ease-in-out;

            i {
                margin: 0;
            }

            &.selected {
                --button-background-color: var(--color-warm-1);
                --button-border-color: var(--color-cool-5);
                --button-text-color: var(--color-cool-5);
                /** Style as a remove button if mousing over an active one */
                &:hover {
                    background-color: var(--color-level-error);
                    i::before {
                        content: "\f00d";
                    }
                }
            }
        }

        + .item {
            border-top: 1px solid var(--color-border);
        }
    }
</style>
