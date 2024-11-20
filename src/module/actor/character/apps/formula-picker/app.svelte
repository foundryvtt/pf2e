<script lang="ts">
    import type { FormulaPickerContext } from "./app.ts";
    import ItemSummary from "@module/sheet/components/item-summary.svelte";
    import ItemTraits from "@module/sheet/components/item-traits.svelte";
    import HoverIconButton from "@module/sheet/components/hover-icon-button.svelte";
    import { sendItemToChat } from "@module/sheet/helpers.ts";

    const { state: data, actor, searchEngine, confirmSelection }: FormulaPickerContext = $props();
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
    <p class="hint">
        {game.i18n.format("PF2E.Actor.Character.Crafting.Action.Hint", {
            resource: data.resource?.label ?? "",
            value: data.resource?.value ?? "",
            max: data.resource?.max ?? "",
        })}
    </p>
    <div class="search">
        <input
            type="search"
            spellcheck="false"
            bind:value={queryText}
            placeholder={game.i18n.localize("PF2E.Actor.Character.Crafting.Search")}
        />
    </div>
    {#if !data.resource?.value}
        <p class="notification warning">{game.i18n.localize("PF2E.Actor.Character.Crafting.MissingResource")}</p>
    {/if}
</header>

<section class="content">
    {#each filteredSections as section (section.level)}
        <header>{game.i18n.format("PF2E.LevelN", { level: section.level })}</header>
        <ol class="items-list">
            {#each section.formulas as formula (formula.item.id)}
                <li class="item">
                    <HoverIconButton
                        class="item-image"
                        src={formula.item.img}
                        icon="fa-solid fa-message"
                        onclick={(event) => sendItemToChat(formula.item.uuid, { event, actor })}
                    />
                    <div
                        role="none"
                        class="name"
                        data-rarity={formula.item.rarity}
                        onclick={() => (openStates[formula.item.uuid] = !openStates[formula.item.uuid])}
                    >
                        <span>{formula.item.name}</span>
                        <ItemTraits traits={formula.item.traits} rarity={formula.item.rarity} />
                    </div>
                    <button onclick={() => confirmSelection(formula.item.uuid)} data-tooltip="Confirm">
                        <i class="fa-solid fa-fw fa-check"></i>
                    </button>
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
        padding: var(--space-8);
        padding-top: 0;

        header {
            border-bottom: 1px solid var(--color-border);
            margin-top: var(--space-10);
            margin-bottom: var(--space-2);
            font-weight: 500;
            font-size: var(--font-size-16);
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
        padding: var(--space-4) 0;
        margin: 0;

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
                    padding: 0.15em 0.3em 0.1em 0.3em;
                }
            }
        }

        > button {
            width: 1.75rem;
            height: 1.75rem;
            margin-top: var(--space-4);
            i {
                margin: 0;
            }
        }

        + .item {
            border-top: 1px solid var(--color-border);
        }
    }
</style>
