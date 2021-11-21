import { ConsumablePF2e, MeleePF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { ActorPF2e, CharacterPF2e, NPCPF2e } from "@actor";
import { StatisticModifier } from "@module/modifiers";
import {
    attemptToRemoveCoinsByValue,
    coinsToString,
    extractPriceFromItem,
    multiplyCoinValue,
} from "@item/treasure/helpers";
import { LocalizePF2e } from "@system/localize";
import { isSpellConsumable } from "@item/consumable/spell-consumables";
import { craftSpellConsumable } from "@module/crafting/helpers";

export const ChatCards = {
    listen: ($html: JQuery) => {
        $html.find('.card-buttons button, button[data-action="consume"]').on("click", async (event) => {
            event.preventDefault();

            // Extract card data
            const button = $(event.currentTarget);
            const messageId = button.parents(".message").attr("data-message-id") ?? "";
            const message = game.messages.get(messageId);
            const card = button.parents(".chat-card");
            const action = button.attr("data-action");

            // Get the actor and item from the chat message
            const item = message?.item;
            const actor = item?.actor ?? message?.actor;

            if (!actor) return;

            // Confirm roll permission
            if (!game.user.isGM && !actor.isOwner && action !== "save") return;

            if (item) {
                const spell =
                    item instanceof SpellPF2e ? item : item instanceof ConsumablePF2e ? item.embeddedSpell : null;
                const strike: StatisticModifier =
                    "actions" in actor.data.data
                        ? actor.data.data.actions.find((a: StatisticModifier) => a.item === item.id) ?? null
                        : null;
                const rollOptions = actor.getRollOptions(["all", "attack-roll"]);

                if (action === "weaponAttack") {
                    if (strike && rollOptions) {
                        strike.variants[0].roll({ event: event, options: rollOptions });
                    }
                } else if (action === "weaponAttack2") {
                    if (strike && rollOptions) {
                        strike.variants[1].roll({ event: event, options: rollOptions });
                    }
                } else if (action === "weaponAttack3") {
                    if (strike && rollOptions) {
                        strike.variants[2].roll({ event: event, options: rollOptions });
                    }
                } else if (action === "weaponDamage") {
                    if (strike && rollOptions) {
                        strike.damage({ event: event, options: rollOptions });
                    }
                } else if (action === "weaponDamageCritical" || action === "criticalDamage") {
                    if (strike && rollOptions) {
                        strike.critical({ event: event, options: rollOptions });
                    }
                } else if (action === "npcAttack" && item instanceof MeleePF2e) item.rollNPCAttack(event);
                else if (action === "npcAttack2" && item instanceof MeleePF2e) item.rollNPCAttack(event, 2);
                else if (action === "npcAttack3" && item instanceof MeleePF2e) item.rollNPCAttack(event, 3);
                else if (action === "npcDamage" && item instanceof MeleePF2e) item.rollNPCDamage(event);
                else if (action === "npcDamageCritical" && item instanceof MeleePF2e) item.rollNPCDamage(event, true);
                // Spell actions
                else if (action === "spellAttack") spell?.rollAttack(event);
                else if (action === "spellAttack2") spell?.rollAttack(event, 2);
                else if (action === "spellAttack3") spell?.rollAttack(event, 3);
                else if (action === "spellDamage") spell?.rollDamage(event);
                else if (action === "spellCounteract") item.rollCounteract(event);
                else if (action === "spellTemplate") item.placeTemplate(event);
                // Consumable usage
                else if (action === "consume") {
                    if (item instanceof ConsumablePF2e) {
                        item.consume();
                    } else if (item instanceof MeleePF2e) {
                        // Button is from an NPC attack effect
                        const consumable = actor.items.get(button.attr("data-item") ?? "");
                        if (consumable instanceof ConsumablePF2e) {
                            const oldQuant = consumable.data.data.quantity.value;
                            const toReplace = `${consumable.name} - ${LocalizePF2e.translations.ITEM.TypeConsumable} (${oldQuant})`;
                            await consumable.consume();
                            const currentQuant = oldQuant === 1 ? 0 : consumable.data.data.quantity.value;
                            let flavor = message.data.flavor?.replace(
                                toReplace,
                                `${consumable.name} - ${LocalizePF2e.translations.ITEM.TypeConsumable} (${currentQuant})`
                            );
                            if (currentQuant === 0) {
                                const buttonStr = `>${LocalizePF2e.translations.PF2E.ConsumableUseLabel}</button>`;
                                flavor = flavor?.replace(buttonStr, " disabled" + buttonStr);
                            }
                            await message.update({ flavor });
                            message.render(true);
                        }
                    }
                } else if (action === "save") {
                    ActorPF2e.rollSave(event, item);
                }
            } else if (actor instanceof CharacterPF2e || actor instanceof NPCPF2e) {
                const strikeIndex = card.attr("data-strike-index");
                const strikeName = card.attr("data-strike-name");
                const strikeAction = actor.data.data.actions[Number(strikeIndex)];

                if (strikeAction && strikeAction.name === strikeName) {
                    const options = actor.getRollOptions(["all", "attack-roll"]);
                    if (action === "strikeAttack") strikeAction.variants[0].roll({ event: event, options });
                    else if (action === "strikeAttack2") strikeAction.variants[1].roll({ event: event, options });
                    else if (action === "strikeAttack3") strikeAction.variants[2].roll({ event: event, options });
                    else if (action === "strikeDamage") strikeAction.damage?.({ event: event, options });
                    else if (action === "strikeCritical") strikeAction.critical?.({ event: event, options });
                }
                if (action === "pay-crafting-costs") {
                    const itemUuid = card.attr("data-item-uuid") || "";
                    const item = await fromUuid(itemUuid);
                    if (item === null || !(item instanceof PhysicalItemPF2e)) return;
                    const quantity = Number(card.attr("data-crafting-quantity")) || 1;
                    const craftingCost = extractPriceFromItem({
                        data: { quantity: { value: quantity }, price: item.data.data.price },
                    });
                    const coinsToRemove = button.hasClass("full") ? craftingCost : multiplyCoinValue(craftingCost, 0.5);
                    if (
                        !(await attemptToRemoveCoinsByValue({
                            actor: actor,
                            coinsToRemove: coinsToRemove,
                        }))
                    ) {
                        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.InsufficientCoins"));
                        return;
                    }

                    if (isSpellConsumable(item.id)) {
                        craftSpellConsumable(item, quantity, actor);
                        ChatMessage.create({
                            user: game.user.id,
                            content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                                actorName: actor.name,
                                cost: coinsToString(coinsToRemove),
                                quantity: quantity,
                                itemName: item.name,
                            }),
                            speaker: { alias: actor.name },
                        });
                        return;
                    }

                    const itemObject = item.toObject();
                    itemObject.data.quantity.value = quantity;

                    const result = await actor.addToInventory(itemObject, undefined);
                    if (!result) {
                        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.CantAddItem"));
                        return;
                    }

                    ChatMessage.create({
                        user: game.user.id,
                        content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                            actorName: actor.name,
                            cost: coinsToString(coinsToRemove),
                            quantity: quantity,
                            itemName: item.name,
                        }),
                        speaker: { alias: actor.name },
                    });
                } else if (action === "lose-materials") {
                    const itemUuid = card.attr("data-item-uuid") || "";
                    const item = await fromUuid(itemUuid);
                    if (item === null || !(item instanceof PhysicalItemPF2e)) return;
                    const quantity = Number(card.attr("data-crafting-quantity")) || 1;
                    const craftingCost = extractPriceFromItem({
                        data: { quantity: { value: quantity }, price: item.data.data.price },
                    });
                    const materialCosts = multiplyCoinValue(craftingCost, 0.5);
                    const coinsToRemove = multiplyCoinValue(materialCosts, 0.1);
                    if (
                        !(await attemptToRemoveCoinsByValue({
                            actor: actor,
                            coinsToRemove: coinsToRemove,
                        }))
                    ) {
                        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Craft.Warning.InsufficientCoins"));
                    } else {
                        ChatMessage.create({
                            user: game.user.id,
                            content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
                                actorName: actor.name,
                                cost: coinsToString(coinsToRemove),
                            }),
                            speaker: { alias: actor.name },
                        });
                    }
                }
            }
        });
    },
};
