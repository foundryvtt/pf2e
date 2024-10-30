<script lang="ts">
    import { ErrorPF2e } from "@util";
    import type { KeyboardEventHandler, MouseEventHandler } from "svelte/elements";
    import type { ABCPickerContext } from "./app.ts";

    const { actor, foundryApp, state: data }: ABCPickerContext = $props();
    const typePlural = game.i18n.localize(`PF2E.Item.${data.itemType.capitalize()}.Plural`);
    const searchPlaceholder = game.i18n.format("PF2E.Actor.Character.ABCPicker.SearchPlaceholder", {
        items: typePlural,
    });

    let selection: string | null = $state(null);
    /** Show the confirmation button. */
    const showConfirmation: MouseEventHandler<HTMLButtonElement> = (event): void => {
        const row = event.currentTarget.closest("li");
        selection = selection === row?.dataset.uuid ? null : (row?.dataset.uuid ?? null);
    };

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
            row.hidden = !regexp.test(row.innerText ?? "");
        }
    }, 200);
</script>

<header class="search">
    <i class="fa-solid fa-search"></i>
    <input type="search" spellcheck="false" placeholder={searchPlaceholder} onkeyup={searchItems} />
</header>

<ul>
    {#each data.items as item}
        <li class:selected={selection === item.uuid} data-uuid={item.uuid}>
            <img src={item.img} loading="lazy" alt="Class icon" />
            <button type="button" class="flat name-source" onclick={showConfirmation}>
                <div class="name">{item.name}</div>
                <div class="source" class:publication={item.source.publication}>{item.source.name}</div>
            </button>
            <div class="buttons">
                <button
                    type="button"
                    class="confirm"
                    data-tooltip="PF2E.Actor.Character.ABCPicker.Tooltip.ConfirmSelection"
                    onclick={saveSelection}><i class="fa-solid fa-check"></i></button
                >
                <button
                    type="button"
                    data-tooltip="PF2E.Actor.Character.ABCPicker.Tooltip.ViewSheet"
                    onclick={viewItemSheet}><i class="fa-solid fa-info fa-fw"></i></button
                >
            </div>
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

        & > li {
            align-items: center;
            border-top: 1px solid var(--color-border);
            display: flex;
            gap: var(--space-8);
            margin: 0;
            padding: var(--space-3) var(--space-6);

            img {
                color: pointer;
                border: none;
                height: 3rem;
            }

            button.name-source {
                display: flex;
                flex-flow: column nowrap;
                flex-grow: 1;
                justify-content: center;

                .name {
                    color: var(--color-text-primary);
                }

                .source {
                    color: var(--color-form-hint);
                    font-size: var(--font-size-12);

                    &.publication {
                        font-style: italic;
                    }
                }
            }

            .buttons {
                align-items: center;
                display: flex;
                gap: var(--space-2);
                flex-flow: row nowrap;
                justify-content: end;

                button {
                    font-size: var(--font-size-12);
                    height: 1.5rem;
                    width: 1.5rem;

                    i {
                        margin-right: 0;
                    }

                    &.confirm {
                        opacity: 0;
                        visibility: hidden;

                        &:not(:hover) {
                            color: darkgreen;
                        }
                    }
                }
            }

            &:hover:not(.selected) button.confirm {
                opacity: 0.33;
                visibility: visible;
            }

            &.selected button.confirm {
                opacity: 1;
                visibility: visible;
            }
        }
    }
</style>
