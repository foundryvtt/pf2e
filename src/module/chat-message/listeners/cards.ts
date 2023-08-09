import { ActorPF2e } from "@actor";
import { craftItem, craftSpellConsumable } from "@actor/character/crafting/helpers.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { isSpellConsumable } from "@item/consumable/spell-consumables.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { onRepairChatCardEvent } from "@system/action-macros/crafting/repair.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, sluggify, tupleHasValue } from "@util";
import { ChatMessagePF2e } from "../index.ts";

class ChatCards {
    static listen(message: ChatMessagePF2e, html: HTMLElement): void {
        const selector = [".card-buttons button", ".message-buttons button", "button[data-action=consume]"].join(",");
        for (const button of htmlQueryAll<HTMLButtonElement>(html, selector)) {
            button.addEventListener("click", async (event) => this.#onClickButton({ message, event, html, button }));
        }
    }

    static async #onClickButton({ message, event, html, button }: OnClickButtonParams): Promise<void> {
        // Extract card data
        const card = htmlClosest(button, ".chat-card, .message-buttons");
        const action = button.dataset.action;

        // Get the actor and item from the chat message
        const item = message.item;
        const actor = item?.actor ?? message.actor;
        if (!actor) return;

        // Confirm roll permission
        if (!game.user.isGM && !actor.isOwner && action !== "spell-save") return;

        // Handle strikes
        const strikeAction = message._strike;
        if (strikeAction && action?.startsWith("strike-")) {
            const context = message.flags.pf2e.context;
            const mapIncreases = context && "mapIncreases" in context ? context.mapIncreases : null;
            const altUsage = context && "altUsage" in context ? context.altUsage : null;
            const options = actor.getRollOptions(["all", "attack-roll"]);
            const target = message.target?.token?.object ?? null;
            const rollArgs = { event, altUsage, mapIncreases, options, target };

            switch (sluggify(action ?? "")) {
                case "strike-attack":
                    strikeAction.variants[0].roll(rollArgs);
                    return;
                case "strike-attack2":
                    strikeAction.variants[1].roll(rollArgs);
                    return;
                case "strike-attack3":
                    strikeAction.variants[2].roll(rollArgs);
                    return;
                case "strike-damage":
                    strikeAction.damage?.(rollArgs);
                    return;
                case "strike-critical":
                    strikeAction.critical?.(rollArgs);
                    return;
            }
        }

        // Handle everything else
        if (item) {
            const spell = item.isOfType("spell") ? item : item.isOfType("consumable") ? item.embeddedSpell : null;

            // Spell actions
            switch (action) {
                case "spell-attack":
                    return spell?.rollAttack(event);
                case "spell-attack-2":
                    return spell?.rollAttack(event, 2);
                case "spell-attack-3":
                    return spell?.rollAttack(event, 3);
                case "spell-damage":
                    spell?.rollDamage(event);
                    return;
                case "spell-save":
                    return this.#rollActorSaves({ event, button, actor, item });
                case "affliction-save":
                    if (item?.isOfType("affliction")) {
                        item.rollRecovery();
                    }
                    return;
                case "spell-counteract":
                    spell?.rollCounteract(event);
                    return;
                case "spell-template":
                    return spell?.placeTemplate(message);
                case "spell-template-clear": {
                    const templateIds =
                        canvas.scene?.templates.filter((t) => t.message === message).map((t) => t.id) ?? [];
                    button.disabled = true;
                    await canvas.scene?.deleteEmbeddedDocuments("MeasuredTemplate", templateIds);
                    button.disabled = false;
                    return;
                }
                case "spell-variant": {
                    const castLevel = Number(htmlQuery(html, "div.chat-card")?.dataset.castLevel) || 1;
                    const overlayIds = button.dataset.overlayIds?.split(",").map((id) => id.trim());
                    if (overlayIds) {
                        const variantSpell = spell?.loadVariant({ overlayIds, castLevel });
                        if (variantSpell) {
                            const variantMessage = await variantSpell.toMessage(undefined, {
                                create: false,
                                data: { castLevel },
                            });
                            if (variantMessage) {
                                const messageSource = variantMessage.toObject();
                                await message.update(messageSource);
                            }
                        }
                    } else if (spell) {
                        const originalSpell = spell?.original ?? spell;
                        const originalMessage = await originalSpell.toMessage(undefined, {
                            create: false,
                            data: { castLevel },
                        });
                        if (originalMessage) {
                            await message.update(originalMessage.toObject());
                        }
                    }
                    return;
                }
                case "consume": {
                    // Consumable usage
                    if (item.isOfType("consumable")) {
                        item.consume();
                    } else if (item.isOfType("melee")) {
                        // Button is from an NPC attack effect
                        const consumable = actor.items.get(button.dataset.item ?? "");
                        if (consumable?.isOfType("consumable")) {
                            const oldQuant = consumable.quantity;
                            const consumableString = game.i18n.localize("TYPES.Item.consumable");
                            const toReplace = `${consumable.name} - ${consumableString} (${oldQuant})`;
                            await consumable.consume();
                            const currentQuant = oldQuant === 1 ? 0 : consumable.quantity;
                            let flavor = message.flavor.replace(
                                toReplace,
                                `${consumable.name} - ${consumableString} (${currentQuant})`
                            );
                            if (currentQuant === 0) {
                                const buttonStr = `>${game.i18n.localize("PF2E.ConsumableUseLabel")}</button>`;
                                flavor = flavor?.replace(buttonStr, " disabled" + buttonStr);
                            }
                            await message.update({ flavor });
                            message.render(true);
                        }
                    }
                    return;
                }
            }
        } else if (actor.isOfType("character", "npc")) {
            const physicalItem = await (async (): Promise<PhysicalItemPF2e | null> => {
                const itemUuid = card?.dataset.itemUuid ?? "";
                const maybeItem = await fromUuid(itemUuid);
                return maybeItem instanceof PhysicalItemPF2e ? maybeItem : null;
            })();
            const quantity = Number(card?.dataset.craftingQuantity) || 1;

            if (action === "repair-item" && card) {
                await onRepairChatCardEvent(event, message, card);
            } else if (physicalItem && action === "pay-crafting-costs") {
                const quantity = Number(card?.dataset.craftingQuantity) || 1;
                const craftingCost = CoinsPF2e.fromPrice(physicalItem.price, quantity);
                const coinsToRemove = button.classList.contains("full") ? craftingCost : craftingCost.scale(0.5);
                if (!(await actor.inventory.removeCoins(coinsToRemove))) {
                    return ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.InsufficientCoins"));
                }

                if (isSpellConsumable(physicalItem.id) && physicalItem.isOfType("consumable")) {
                    craftSpellConsumable(physicalItem, quantity, actor);
                    ChatMessagePF2e.create({
                        user: game.user.id,
                        content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                            actorName: actor.name,
                            cost: coinsToRemove.toString(),
                            quantity: quantity,
                            itemName: physicalItem.name,
                        }),
                        speaker: { alias: actor.name },
                    });
                    return;
                }

                const itemObject = physicalItem.toObject();
                itemObject.system.quantity = quantity;

                const result = await actor.addToInventory(itemObject, undefined);
                if (!result) {
                    return ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.CantAddItem"));
                }

                ChatMessagePF2e.create({
                    user: game.user.id,
                    content: game.i18n.format("PF2E.Actions.Craft.Information.LoseMaterials", {
                        actorName: actor.name,
                        cost: coinsToRemove.toString(),
                        quantity: quantity,
                        itemName: physicalItem.name,
                    }),
                    speaker: { alias: actor.name },
                });
            } else if (physicalItem && action === "lose-materials") {
                const craftingCost = CoinsPF2e.fromPrice(physicalItem.price, quantity);
                const materialCosts = craftingCost.scale(0.5);
                const coinsToRemove = materialCosts.scale(0.1);
                if (!(await actor.inventory.removeCoins(coinsToRemove))) {
                    ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.InsufficientCoins"));
                } else {
                    ChatMessagePF2e.create({
                        user: game.user.id,
                        content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                            actorName: actor.name,
                            cost: coinsToRemove.toString(),
                        }),
                        speaker: { alias: actor.name },
                    });
                }
            } else if (physicalItem && action === "receieve-crafting-item") {
                if (isSpellConsumable(physicalItem.id) && physicalItem.isOfType("consumable")) {
                    return craftSpellConsumable(physicalItem, quantity, actor);
                } else {
                    return craftItem(physicalItem, quantity, actor);
                }
            }
        }
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     */
    static async #rollActorSaves({ event, button, actor, item }: RollActorSavesParams): Promise<void> {
        if (canvas.tokens.controlled.length > 0) {
            const saveType = button.dataset.save;
            if (!tupleHasValue(SAVE_TYPES, saveType)) {
                throw ErrorPF2e(`"${saveType}" is not a recognized save type`);
            }

            const dc = Number(button.dataset.dc ?? "NaN");
            for (const token of canvas.tokens.controlled) {
                const save = token.actor?.saves?.[saveType];
                if (!save) return;

                save.check.roll({
                    ...eventToRollParams(event),
                    dc: Number.isInteger(dc) ? { value: Number(dc) } : null,
                    item,
                    origin: actor,
                });
            }
        } else {
            ui.notifications.error(game.i18n.localize("PF2E.UI.errorTargetToken"));
        }
    }
}

interface OnClickButtonParams {
    message: ChatMessagePF2e;
    event: MouseEvent;
    html: HTMLElement;
    button: HTMLButtonElement;
}

interface RollActorSavesParams {
    event: MouseEvent;
    button: HTMLButtonElement;
    actor: ActorPF2e;
    item: ItemPF2e<ActorPF2e>;
}

export { ChatCards };
