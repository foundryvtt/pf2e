<script lang="ts">
    import { ErrorPF2e } from "@util";
    import type { MouseEventHandler } from "svelte/elements";
    import type { ABCPickerContext } from "./app.ts";

    const { actor, foundryApp, state: data }: ABCPickerContext = $props();
    let searchQuery = $state("");
    const filteredItems = $derived.by(() => {
        const query = searchQuery.trim();
        if (!query.length) return data.items;

        const regexp = new RegExp(RegExp.escape(query), "i");
        return data.items.filter((item) => {
            if (searchQuery.length === 0) return true;
            const name = item.name;
            const originalName = item.originalName;
            return regexp.test(name) || (originalName && regexp.test(originalName));
        });
    });

    const typePlural = game.i18n.localize(`PF2E.Item.${data.itemType.capitalize()}.Plural`);
    const searchPlaceholder = game.i18n.format("PF2E.Actor.Character.ABCPicker.SearchPlaceholder", {
        items: typePlural,
    });

    /** Open an item sheet to show additional details. */
    const viewItemSheet: MouseEventHandler<HTMLButtonElement> = async (event): Promise<void> => {
        const uuid = event.currentTarget.closest("li")?.dataset?.uuid ?? "";
        const item = await fromUuid<Item>(uuid);
        item?.sheet.render(true);
    };

    /** Create a new embedded ABC item on the character. */
    const saveSelection: MouseEventHandler<HTMLButtonElement> = async (event): Promise<void> => {
        const uuid = event.currentTarget.closest("li")?.dataset?.uuid ?? "";
        const item = await fromUuid(uuid);
        if (!(item instanceof Item) || item.type !== data.itemType) {
            throw ErrorPF2e(`Unexpected error retrieving ${data.itemType}`);
        }
        actor.createEmbeddedDocuments("Item", [{ ...item.toObject(), _id: null }]);
        foundryApp.close();
    };
</script>

<search>
    <i class="fa-solid fa-search"></i>
    <input type="search" spellcheck="false" placeholder={searchPlaceholder} bind:value={searchQuery} />
</search>

<menu class="scrollable">
    {#each filteredItems as item}
        <li data-uuid={item.uuid} class:no-rarity={!item.rarity} data-original-name={item.originalName || null}>
            <img src={item.img} loading="lazy" alt="Class icon" />
            <div class="name">{item.name}</div>
            {#if item.rarity}
                <div class="tags paizo-style">
                    <span class="tag rarity {item.rarity.slug}">{item.rarity.label}</span>
                </div>
            {/if}
            <div class="source" class:publication={item.source.publication}>
                {item.source.name}
            </div>
            <div class="buttons">
                <button
                    type="button"
                    class="confirm icon fa-solid fa-check"
                    data-tooltip
                    aria-label={game.i18n.localize("PF2E.Actor.Character.ABCPicker.Tooltip.ConfirmSelection")}
                    onclick={saveSelection}
                ></button>
                <button
                    type="button"
                    class="icon fa-solid fa-memo-pad"
                    data-tooltip
                    aria-label={game.i18n.localize("PF2E.Actor.Character.ABCPicker.Tooltip.ViewSheet")}
                    onclick={viewItemSheet}
                ></button>
            </div>
        </li>
    {/each}
</menu>

<style>
    search {
        align-items: center;
        flex-flow: row nowrap;
        gap: var(--space-8);
        justify-content: start;
        padding: var(--space-8) var(--space-8) 0;
        input::placeholder {
            color: var(--color-form-hint);
        }
    }

    menu {
        --scroll-margin: 0;
        flex-flow: column nowrap;

        > li {
            column-gap: var(--space-8);
            display: grid;
            grid-template:
                "icon name buttons"
                "icon rarity buttons"
                "icon source buttons" / 48px 3fr 1fr;
            align-items: center;
            border-top: 1px solid var(--color-border);
            padding: var(--space-4);

            &.no-rarity {
                grid-template-areas:
                    "icon name buttons"
                    "icon source buttons";
            }

            img {
                border: none;
                height: 3rem;
                grid-area: icon;
                width: 3rem;
            }

            .name {
                align-self: end;
                grid-area: name;
                color: var(--color-text-primary);
                padding-left: var(--space-1);
            }

            .tags {
                grid-area: rarity;
                padding: 0;
            }

            .source {
                align-self: start;
                color: var(--color-form-hint);
                font-size: var(--font-size-12);
                grid-area: source;
                padding-left: var(--space-1);
                &.publication {
                    font-style: italic;
                }
            }
            &.no-rarity {
                .source {
                    align-self: start;
                }
            }

            .buttons {
                align-self: center;
                display: flex;
                flex-flow: row nowrap;
                font-size: var(--font-size-12);
                gap: var(--space-4);
                grid-area: buttons;

                button.confirm {
                    color: darkgreen;
                }
            }
        }
    }
</style>
