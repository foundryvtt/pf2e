import { ActorPF2e } from "@actor";
import { craftItem, craftSpellConsumable } from "@actor/character/crafting/helpers.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { isSpellConsumable } from "@item/consumable/spell-consumables.ts";
import { CoinsPF2e } from "@item/physical/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { onRepairChatCardEvent } from "@system/action-macros/crafting/repair.ts";
import { ErrorPF2e, sluggify, tupleHasValue } from "@util";
import { ChatMessagePF2e } from "../index.ts";

export const ChatCards = {
    listen: ($html: JQuery): void => {
        const selectors = [".card-buttons button", ".message-buttons button", "button[data-action=consume]"].join(",");
        $html.find(selectors).on("click", async (event) => {
            event.preventDefault();

            // Extract card data
            const $button = $(event.currentTarget);
            const messageId = $button.parents(".message").attr("data-message-id") ?? "";
            const message = game.messages.get(messageId, { strict: true });
            const $card = $button.closest(".chat-card, .message-buttons");
            const action = $button.attr("data-action");

            // Get the actor and item from the chat message
            const item = message.item;
            const actor = item?.actor ?? message.actor;
            if (!actor) return;

            // Confirm roll permission
            if (!game.user.isGM && !actor.isOwner && action !== "save") return;

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
                if (action === "spellAttack") spell?.rollAttack(event);
                else if (action === "spellAttack2") spell?.rollAttack(event, 2);
                else if (action === "spellAttack3") spell?.rollAttack(event, 3);
                else if (action === "spellDamage") spell?.rollDamage(event);
                else if (action === "spellCounteract") spell?.rollCounteract(event);
                else if (action === "spellTemplate") spell?.placeTemplate();
                else if (action === "selectVariant") {
                    const castLevel =
                        Number($html[0].querySelector<HTMLElement>("div.chat-card")?.dataset.castLevel) || 1;
                    const overlayIdString = $button.attr("data-overlay-ids");
                    if (overlayIdString) {
                        const overlayIds = overlayIdString.split(",").map((id) => id.trim());
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
                }
                // Consumable usage
                else if (action === "consume") {
                    if (item.isOfType("consumable")) {
                        item.consume();
                    } else if (item.isOfType("melee")) {
                        // Button is from an NPC attack effect
                        const consumable = actor.items.get($button.attr("data-item") ?? "");
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
                } else if (action === "save") {
                    ChatCards.rollActorSaves({ event, actor, item });
                }
            } else if (actor.isOfType("character", "npc")) {
                if (action === "repair-item") {
                    await onRepairChatCardEvent(event, message, $card);
                } else if (action === "pay-crafting-costs") {
                    const itemUuid = $card.attr("data-item-uuid") || "";
                    const item = await fromUuid(itemUuid);
                    if (!(item instanceof PhysicalItemPF2e)) return;
                    const quantity = Number($card.attr("data-crafting-quantity")) || 1;
                    const craftingCost = CoinsPF2e.fromPrice(item.price, quantity);
                    const coinsToRemove = $button.hasClass("full") ? craftingCost : craftingCost.scale(0.5);
                    if (!(await actor.inventory.removeCoins(coinsToRemove))) {
                        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.InsufficientCoins"));
                        return;
                    }

                    if (isSpellConsumable(item.id) && item.isOfType("consumable")) {
                        craftSpellConsumable(item, quantity, actor);
                        ChatMessagePF2e.create({
                            user: game.user.id,
                            content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                                actorName: actor.name,
                                cost: coinsToRemove.toString(),
                                quantity: quantity,
                                itemName: item.name,
                            }),
                            speaker: { alias: actor.name },
                        });
                        return;
                    }

                    const itemObject = item.toObject();
                    itemObject.system.quantity = quantity;

                    const result = await actor.addToInventory(itemObject, undefined);
                    if (!result) {
                        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.CantAddItem"));
                        return;
                    }

                    ChatMessagePF2e.create({
                        user: game.user.id,
                        content: game.i18n.format("PF2E.Actions.Craft.Information.LoseMaterials", {
                            actorName: actor.name,
                            cost: coinsToRemove.toString(),
                            quantity: quantity,
                            itemName: item.name,
                        }),
                        speaker: { alias: actor.name },
                    });
                } else if (action === "lose-materials") {
                    const itemUuid = $card.attr("data-item-uuid") || "";
                    const item = await fromUuid(itemUuid);
                    if (!(item instanceof PhysicalItemPF2e)) return;
                    const quantity = Number($card.attr("data-crafting-quantity")) || 1;
                    const craftingCost = CoinsPF2e.fromPrice(item.price, quantity);
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
                } else if (action === "receieve-crafting-item") {
                    const itemUuid = $card.attr("data-item-uuid") || "";
                    const item = await fromUuid(itemUuid);
                    if (!(item instanceof PhysicalItemPF2e)) return;
                    const quantity = Number($card.attr("data-crafting-quantity")) || 1;

                    isSpellConsumable(item.id) && item.isOfType("consumable")
                        ? await craftSpellConsumable(item, quantity, actor)
                        : await craftItem(item, quantity, actor);
                    return;
                }
            }
        });
    },

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     */
    rollActorSaves: async ({
        event,
        actor,
        item,
    }: {
        event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement>;
        actor: ActorPF2e;
        item: ItemPF2e<ActorPF2e>;
    }): Promise<void> => {
        if (canvas.tokens.controlled.length > 0) {
            const saveType = event.currentTarget.dataset.save;
            if (!tupleHasValue(SAVE_TYPES, saveType)) {
                throw ErrorPF2e(`"${saveType}" is not a recognized save type`);
            }

            const dc = Number(event.currentTarget.dataset.dc ?? "NaN");
            for (const t of canvas.tokens.controlled) {
                const save = t.actor?.saves?.[saveType];
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
    },
};
