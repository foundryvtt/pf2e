<script lang="ts">
    import { ErrorPF2e } from "@util";
    import type { KeyboardEventHandler, MouseEventHandler } from "svelte/elements";
    import type { ABCPickerContext } from "./app.ts";

    const { actor, foundryApp, state: data }: ABCPickerContext = $props();
    const typePlural = game.i18n.localize(`PF2E.Item.${data.itemType.capitalize()}.Plural`);
    const searchPlaceholder = game.i18n.format("PF2E.Actor.Character.ABCPicker.SearchPlaceholder", {
        items: typePlural,
    });

    /** Open an item sheet to show additional details. */
    const viewItemSheet: MouseEventHandler<HTMLButtonElement> = async (event): Promise<void> => {
        const uuid = event.currentTarget.closest("li")?.dataset?.uuid ?? "";
        const item = await fromUuid(uuid);
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

    /** Search list and show or hide according to match result. */
    const searchItems: KeyboardEventHandler<HTMLInputElement> = (event) => debouncedSearch(event.currentTarget.value);
    const debouncedSearch = fu.debounce((query: string) => {
        const regexp = new RegExp(RegExp.escape(query.trim()), "i");
        for (const row of foundryApp.element.getElementsByTagName("li")) {
            const name = row.innerText ?? "";
            const originalName = row.dataset.originalName;
            row.hidden = !regexp.test(name) && !(originalName && regexp.test(originalName));
        }
    }, 200);
</script>

<header class="search">
    <i class="fa-solid fa-search"></i>
    <input type="search" spellcheck="false" placeholder={searchPlaceholder} onkeyup={searchItems} />
</header>

<ul>
    {#each data.items as item}
        <li data-uuid={item.uuid} data-original-name={item.originalName || null}>
            <button
                type="button"
                class="flat name-source"
                class:omit-rarity={!item.rarity}
                data-tooltip="PF2E.Actor.Character.ABCPicker.Tooltip.ViewSheet"
                onclick={viewItemSheet}
            >
                <img src={item.img} loading="lazy" alt="Class icon" />
                <div class="name">{item.name}</div>
                {#if item.rarity}
                    <div class="tags paizo-style">
                        <span class="tag rarity {item.rarity.slug}">{item.rarity.label}</span>
                    </div>
                {/if}
                <div class="source" class:publication={item.source.publication}>{item.source.name}</div>
            </button>
            <button
                type="button"
                class="confirm"
                aria-labelledby="tooltip"
                data-tooltip="PF2E.Actor.Character.ABCPicker.Tooltip.ConfirmSelection"
                onclick={saveSelection}
            >
                <i class="fa-solid fa-check"></i>
            </button>
        </li>
    {/each}
</ul>

<style>
    header.search {
        align-items: center;
        border-bottom: 1px solid var(--color-border);
        flex-flow: row nowrap;
        gap: var(--space-8);
        justify-content: start;
        padding: var(--space-8) var(--space-8);

        input::placeholder {
            color: var(--color-light-5);
        }
    }

    ul {
        flex-flow: column nowrap;
        height: 100%;
        list-style: none;
        margin: 0;
        overflow: hidden scroll;
        padding: var(--space-4) 0;

        > li {
            align-items: center;
            border-top: 1px solid var(--color-border);
            display: flex;
            margin: 0;
            padding: var(--space-1) var(--space-6) var(--space-4);

            button.name-source {
                column-gap: var(--space-8);
                display: grid;
                flex: 1;
                height: unset;
                justify-content: start;
                grid-template:
                    "icon name" auto
                    "icon rarity" auto
                    "icon source" auto / 3rem auto;

                &.omit-rarity {
                    grid-template:
                        "icon name"
                        "icon source" / 3rem auto;

                    > .name {
                        align-self: end;
                    }

                    > .source {
                        align-self: start;
                    }
                }

                img {
                    border: none;
                    height: 3rem;
                    grid-area: icon;
                    width: 3rem;
                }

                .name {
                    grid-area: name;
                    color: var(--color-text-primary);
                    padding-left: var(--space-1);
                }

                .tags {
                    grid-area: rarity;
                    padding: 0;
                }

                .source {
                    color: var(--color-form-hint);
                    font-size: var(--font-size-12);
                    grid-area: source;
                    padding-left: var(--space-1);
                    &.no-rarity {
                        grid-row: span 2;
                        align-self: start;
                    }

                    &.publication {
                        font-style: italic;
                    }
                }

                &:hover .tag.rarity {
                    text-shadow: 0 0 8px var(--color-shadow-primary);
                }
            }

            button.confirm {
                color: darkgreen;
                font-size: var(--font-size-12);
                height: 1.5rem;
                width: 1.5rem;
                margin-left: auto;
                visibility: hidden;
                i {
                    margin-right: 0;
                }
            }

            &:hover button.confirm {
                visibility: visible;
            }
        }
    }
</style>
