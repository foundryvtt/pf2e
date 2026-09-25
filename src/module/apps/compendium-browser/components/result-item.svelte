<script lang="ts">
    import { ErrorPF2e, htmlClosest } from "@util";
    import { sizeItemForActor } from "@item/physical/helpers.ts";
    import { getSelectedActors } from "@util/token-actor-utils.ts";
    import type { Rarity } from "@module/data.ts";
    import type { CompendiumBrowserIndexData } from "../tabs/data.ts";
    import type { ItemPF2e, KitPF2e, PhysicalItemPF2e } from "@item";
    import type { ContentTabName } from "../data.ts";
    import type { ActorPF2e } from "@actor";
    import InlineIconButton from "@module/sheet/components/inline-icon-button.svelte";

    interface ResultItemProps {
        activeTabName: ContentTabName | "";
        entry: CompendiumBrowserIndexData;
        /** Fade the browser window while a result is dragged. */
        onDragFade: (faded: boolean) => void;
    }
    const { entry, activeTabName, onDragFade }: ResultItemProps = $props();

    async function onClickButton(uuid: string, action: "buy-item" | "open-sheet" | "take-item"): Promise<void> {
        switch (action) {
            case "buy-item":
                buyPhysicalItem(uuid);
                break;
            case "open-sheet":
                (await fromUuid<ActorPF2e | ItemPF2e>(uuid))?.sheet.render(true);
                break;
            case "take-item":
                takePhysicalItem(uuid);
                break;
        }
    }

    /** Set drag data and fade the application window. */
    function onDragStart(event: DragEvent, uuid: string): void {
        event.stopPropagation();
        const item = htmlClosest(event.target, "li");
        if (!item || !event.dataTransfer) return;

        event.dataTransfer?.setDragImage(item, 0, 0);
        onDragFade(true);

        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: fu.parseUuid(uuid)?.type,
                uuid: uuid,
            }),
        );

        item.addEventListener("dragend", () => onDragFade(false), { once: true });
    }

    async function takePhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedActors({ include: ["character", "loot", "npc", "party"], assignedFallback: true });

        if (actors.length === 0) {
            ui.notifications.error(_loc("PF2E.ErrorMessage.NoTokenSelected"));
            return;
        }
        const item = await getPhysicalItem(uuid);

        for (const actor of actors) {
            const sizedItem = item.isOfType("kit") ? item.clone() : sizeItemForActor(item, actor);
            await actor.inventory.add(sizedItem, { stack: true });
        }

        if (actors.length === 1 && game.user.character && actors[0] === game.user.character) {
            ui.notifications.info(
                _loc("PF2E.CompendiumBrowser.AddedItemToCharacter", {
                    item: item.name,
                    character: game.user.character.name,
                }),
            );
        } else {
            ui.notifications.info(_loc("PF2E.CompendiumBrowser.AddedItem", { item: item.name }));
        }
    }

    async function buyPhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedActors({ include: ["character", "loot", "npc"], assignedFallback: true });

        if (actors.length === 0) {
            if (game.user.character?.isOfType("character")) {
                actors.push(game.user.character);
            } else {
                ui.notifications.error(_loc("PF2E.ErrorMessage.NoTokenSelected"));
                return;
            }
        }
        const item = await getPhysicalItem(uuid);

        let purchaseSuccesses = 0;

        for (const actor of actors) {
            if (await actor.inventory.removeCoins(item.price.value)) {
                purchaseSuccesses += 1;
                const sizedItem = item.isOfType("kit") ? item.clone() : sizeItemForActor(item, actor);
                await actor.inventory.add(sizedItem, { stack: true });
            }
        }

        if (actors.length === 1) {
            if (purchaseSuccesses === 1) {
                ui.notifications.info("PF2E.CompendiumBrowser.BoughtItemWithCharacter", {
                    format: { item: item.name, character: actors[0].name },
                });
            } else {
                ui.notifications.warn("PF2E.CompendiumBrowser.FailedToBuyItemWithCharacter", {
                    format: { item: item.name, character: actors[0].name },
                });
            }
        } else {
            if (purchaseSuccesses === actors.length) {
                ui.notifications.info("PF2E.CompendiumBrowser.BoughtItemWithAllCharacters", {
                    format: { item: item.name },
                });
            } else {
                ui.notifications.warn("PF2E.CompendiumBrowser.FailedToBuyItemWithSomeCharacters", {
                    format: { item: item.name },
                });
            }
        }
    }

    async function getPhysicalItem(uuid: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await fromUuid<PhysicalItemPF2e | KitPF2e>(uuid);
        if (!item?.isOfType("physical", "kit")) throw ErrorPF2e("Unexpected failure retrieving compendium item");
        return item;
    }
</script>

<li draggable="true" ondragstart={(event) => onDragStart(event, entry.uuid)}>
    <div class="image">
        <img src={entry.img} alt="" loading="lazy" />
    </div>
    <div class="name">
        <button type="button" class="flat result-link" onclick={() => onClickButton(entry.uuid, "open-sheet")}>
            {entry.name}
        </button>
        {#if entry.actionGlyph}<span class="action-glyph">{entry.actionGlyph}</span>{/if}
    </div>
    {#if entry.rarity}
        <div class="tags paizo-style">
            {#if entry.rarity !== "common"}
                <span class="tag rarity {entry.rarity}" data-tooltip="PF2E.Rarity">
                    {_loc(CONFIG.PF2E.rarityTraits[entry.rarity as Rarity])}
                </span>
            {/if}
        </div>
    {/if}
    {#if entry.price}
        <div class="price" data-tooltip="PF2E.PriceLabel">{entry.price.toString({ short: true })}</div>
    {/if}
    {#if entry.level !== undefined}
        <div class="level">
            <span data-tooltip="PF2E.LevelLabel">{entry.level}</span>
        </div>
    {/if}
    {#if entry.rank}
        <div class="level">
            <span data-tooltip="PF2E.Item.Spell.Rank.Label">{entry.rank}</span>
        </div>
    {/if}
    {#if activeTabName === "equipment"}
        <InlineIconButton
            icon="fa-regular fa-hand-rock"
            aria-label={_loc("PF2E.CompendiumBrowser.TakeLabel")}
            data-tooltip="PF2E.CompendiumBrowser.TakeLabel"
            onclick={() => onClickButton(entry.uuid, "take-item")}
        />
        <InlineIconButton
            icon="fa-solid fa-coins"
            aria-label={_loc("PF2E.CompendiumBrowser.BuyLabel")}
            data-tooltip="PF2E.CompendiumBrowser.BuyLabel"
            onclick={() => onClickButton(entry.uuid, "buy-item")}
        />
    {/if}
</li>

<style lang="scss">
    li {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: flex-start;
        font-family: var(--font-primary);
        font-size: var(--font-size-14);

        &:nth-child(odd) {
            background-color: var(--table-row-color-even);
        }

        align-items: center;
        gap: 0.25rem;
        padding: 0.125rem 0.25rem;

        > * {
            flex: 1;
            align-items: center;
            display: flex;
            min-height: 2rem;
            justify-content: center;
        }

        img {
            box-sizing: border-box;
            border: 1px solid var(--color-border-dark);
            border-radius: 2px;
            max-width: 100%;
        }

        .image {
            max-width: 2rem;
        }

        .name {
            gap: 0.25em;
            flex-basis: 6ch;
            justify-content: start;

            button.result-link {
                height: fit-content;
                min-height: 1.5em;

                &:hover {
                    color: var(--button-text-color);
                }

                &:focus {
                    outline: unset;
                    box-shadow: unset;
                }

                &:focus-visible {
                    outline: 2px solid var(--button-focus-outline-color);
                    outline-offset: -2px;
                }
            }
        }

        .tags {
            padding: 0.25em 0.05em;
            margin-bottom: 0;
        }

        .level {
            flex-grow: 1;
            font-weight: 900;
            max-width: 1.5em;
        }

        .price {
            flex: none;
            justify-content: end;
            margin-right: var(--font-size-10);
            min-width: 5em;
        }

        .end {
            margin-right: 0.5em;
        }

        &:hover {
            cursor: grab;
        }

        &:hover,
        &:has(:global(:focus-visible)) {
            background-color: var(--table-row-color-highlight);
        }
    }
</style>
