<script lang="ts">
    import { ErrorPF2e, htmlClosest } from "@util";
    import { sizeItemForActor } from "@item/physical/helpers.ts";
    import { getSelectedActors } from "@util/token-actor-utils.ts";
    import type { Rarity } from "@module/data.ts";
    import type { CompendiumBrowserIndexData } from "../tabs/data.ts";
    import type { KitPF2e, PhysicalItemPF2e } from "@item";
    import type { ContentTabName } from "../data.ts";

    const props: { activeTabName: ContentTabName | ""; entry: CompendiumBrowserIndexData } = $props();
    const entry = props.entry;
    const activeTabName = props.activeTabName;

    async function onClickButton(uuid: string, action: "buy-item" | "open-sheet" | "take-item"): Promise<void> {
        switch (action) {
            case "buy-item":
                buyPhysicalItem(uuid);
                break;
            case "open-sheet":
                (await fromUuid(uuid))?.sheet?.render(true);
                break;
            case "take-item":
                takePhysicalItem(uuid);
                break;
        }
    }

    /** Set drag data and lower opacity of the application window to reveal any tokens */
    function onDragStart(event: DragEvent, uuid: string): void {
        event.stopPropagation();
        const item = htmlClosest(event.target, "li");
        const browser = game.pf2e.compendiumBrowser;
        if (!item || !event.dataTransfer) return;

        event.dataTransfer?.setDragImage(item, 0, 0);
        gsap.to(browser.element, {
            duration: 0.25,
            opacity: 0.125,
            pointerEvents: "none",
        });

        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: fu.parseUuid(uuid)?.documentType,
                uuid: uuid,
            }),
        );

        item.addEventListener(
            "dragend",
            () => {
                window.setTimeout(() => {
                    gsap.to(browser.element, {
                        duration: 0.25,
                        opacity: 1,
                        pointerEvents: "",
                    });
                }, 500);
            },
            { once: true },
        );
    }

    async function takePhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedActors({ include: ["character", "loot", "npc", "party"], assignedFallback: true });

        if (actors.length === 0) {
            ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
            return;
        }
        const item = await getPhysicalItem(uuid);

        for (const actor of actors) {
            const sizedItem = item.isOfType("kit") ? item.clone() : sizeItemForActor(item, actor);
            await actor.inventory.add(sizedItem, { stack: true });
        }

        if (actors.length === 1 && game.user.character && actors[0] === game.user.character) {
            ui.notifications.info(
                game.i18n.format("PF2E.CompendiumBrowser.AddedItemToCharacter", {
                    item: item.name,
                    character: game.user.character.name,
                }),
            );
        } else {
            ui.notifications.info(game.i18n.format("PF2E.CompendiumBrowser.AddedItem", { item: item.name }));
        }
    }

    async function buyPhysicalItem(uuid: string): Promise<void> {
        const actors = getSelectedActors({ include: ["character", "loot", "npc"], assignedFallback: true });

        if (actors.length === 0) {
            if (game.user.character?.isOfType("character")) {
                actors.push(game.user.character);
            } else {
                ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
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
                ui.notifications.info(
                    game.i18n.format("PF2E.CompendiumBrowser.BoughtItemWithCharacter", {
                        item: item.name,
                        character: actors[0].name,
                    }),
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CompendiumBrowser.FailedToBuyItemWithCharacter", {
                        item: item.name,
                        character: actors[0].name,
                    }),
                );
            }
        } else {
            if (purchaseSuccesses === actors.length) {
                ui.notifications.info(
                    game.i18n.format("PF2E.CompendiumBrowser.BoughtItemWithAllCharacters", {
                        item: item.name,
                    }),
                );
            } else {
                ui.notifications.warn(
                    game.i18n.format("PF2E.CompendiumBrowser.FailedToBuyItemWithSomeCharacters", {
                        item: item.name,
                    }),
                );
            }
        }
    }

    async function getPhysicalItem(uuid: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await fromUuid<PhysicalItemPF2e | KitPF2e>(uuid);
        if (!item?.isOfType("physical", "kit")) {
            throw ErrorPF2e("Unexpected failure retrieving compendium item");
        }

        return item;
    }
</script>

<li draggable="true" ondragstart={(event) => onDragStart(event, entry.uuid)}>
    <div class="image">
        <img src={entry.img} alt={entry.name} loading="lazy" />
    </div>
    <div class="name">
        <button class="flat result-link" onclick={() => onClickButton(entry.uuid, "open-sheet")}>{entry.name}</button>
        {#if entry.actionGlyph}<span class="action-glyph">{entry.actionGlyph}</span>{/if}
    </div>
    {#if entry.rarity}
        <div class="tags paizo-style">
            {#if entry.rarity !== "common"}
                <span class="tag rarity {entry.rarity}" data-tooltip="PF2E.Rarity">
                    {game.i18n.localize(CONFIG.PF2E.rarityTraits[entry.rarity as Rarity])}
                </span>
            {/if}
        </div>
    {/if}
    {#if entry.price}
        <div class="price" data-tooltip="PF2E.PriceLabel">{entry.price}</div>
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
        <button
            class="equipment-action flat"
            aria-label="take item"
            data-tooltip="PF2E.CompendiumBrowser.TakeLabel"
            onclick={() => onClickButton(entry.uuid, "take-item")}
        >
            <i class="fa-regular fa-hand-rock"></i>
        </button>
        <button
            class="equipment-action flat"
            aria-label="buy item"
            data-tooltip="PF2E.CompendiumBrowser.BuyLabel"
            onclick={() => onClickButton(entry.uuid, "buy-item")}
        >
            <i class="fa-solid fa-coins"></i>
        </button>
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
            background-color: var(--color-result-list-odd);
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

        button.equipment-action {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: unset;
            width: 1.5em;

            i {
                margin-right: unset;
            }

            &:hover {
                color: var(--button-text-color);
                box-shadow: unset;
            }

            &:focus {
                outline: unset;
                box-shadow: unset;
            }
        }

        &:hover {
            background-color: rgba(255, 255, 255, 0.25);
            cursor: grab;
        }
    }
</style>
