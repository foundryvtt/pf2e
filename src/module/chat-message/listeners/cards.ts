import { craftItem, craftSpellConsumable } from "@actor/character/crafting/helpers";
import { StrikeData } from "@actor/data/base";
import { SAVE_TYPES } from "@actor/values";
import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { isSpellConsumable } from "@item/consumable/spell-consumables";
import { CoinsPF2e } from "@item/physical/helpers";
import { eventToRollParams } from "@scripts/sheet-util";
import { onRepairChatCardEvent } from "@system/action-macros/crafting/repair";
import { LocalizePF2e } from "@system/localize";
import { ErrorPF2e, sluggify, tupleHasValue } from "@util";
import { ChatMessagePF2e } from "..";

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

            if (item && !action?.startsWith("strike-")) {
                const spell = item.isOfType("spell") ? item : item.isOfType("consumable") ? item.embeddedSpell : null;
                const strikes: StrikeData[] = actor.isOfType("character", "npc") ? actor.system.actions : [];
                const strike = strikes.find((a) => a.item.id === item.id && a.item.slug === item.slug) ?? null;
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
                        strike.damage?.({ event: event, options: rollOptions });
                    }
                } else if (action === "weaponDamageCritical" || action === "criticalDamage") {
                    if (strike && rollOptions) {
                        strike.critical?.({ event: event, options: rollOptions });
                    }
                } else if (action === "npcAttack" && item.isOfType("melee")) item.rollNPCAttack(event);
                else if (action === "npcAttack2" && item.isOfType("melee")) item.rollNPCAttack(event, 2);
                else if (action === "npcAttack3" && item.isOfType("melee")) item.rollNPCAttack(event, 3);
                else if (action === "npcDamage" && item.isOfType("melee")) item.rollNPCDamage(event);
                else if (action === "npcDamageCritical" && item.isOfType("melee")) item.rollNPCDamage(event, true);
                // Spell actions
                else if (action === "spellAttack") spell?.rollAttack(event);
                else if (action === "spellAttack2") spell?.rollAttack(event, 2);
                else if (action === "spellAttack3") spell?.rollAttack(event, 3);
                else if (action === "spellDamage") spell?.rollDamage(event);
                else if (action === "spellCounteract") spell?.rollCounteract(event);
                else if (action === "spellTemplate") spell?.placeTemplate();
                else if (action === "selectVariant") {
                    const castLevel =
                        Number($html[0].querySelector<HTMLElement>("div.chat-card")?.dataset.castLevel) || 1;
                    const overlayIdString = $button.attr("data-overlay-ids");
                    const originalId = $button.attr("data-original-id") ?? "";
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
                    } else if (originalId) {
                        const originalSpell = actor.items.get(originalId, { strict: true });
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
                            const toReplace = `${consumable.name} - ${LocalizePF2e.translations.ITEM.TypeConsumable} (${oldQuant})`;
                            await consumable.consume();
                            const currentQuant = oldQuant === 1 ? 0 : consumable.quantity;
                            let flavor = message.flavor.replace(
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
                    ChatCards.rollActorSaves(event, item);
                }
            } else if (actor.isOfType("character", "npc")) {
                const strikeName = $card.attr("data-strike-name");
                const altUsage = message.flags.pf2e.context?.altUsage;
                const strikeAction = message._strike;

                if (strikeAction && strikeAction.name === strikeName) {
                    const options = actor.getRollOptions(["all", "attack-roll"]);
                    switch (sluggify(action ?? "")) {
                        case "strike-attack":
                            strikeAction.variants[0].roll({ event, altUsage, options });
                            break;
                        case "strike-attack2":
                            strikeAction.variants[1].roll({ event, altUsage, options });
                            break;
                        case "strike-attack3":
                            strikeAction.variants[2].roll({ event, altUsage, options });
                            break;
                        case "strike-damage":
                            strikeAction.damage?.({ event, altUsage, options });
                            break;
                        case "strike-critical":
                            strikeAction.critical?.({ event, altUsage, options });
                            break;
                    }
                } else if (action === "repair-item") {
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
                        content: game.i18n.format("PF2E.Actions.Craft.Information.PayAndReceive", {
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
    rollActorSaves: async (
        event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement>,
        item: Embedded<ItemPF2e>
    ): Promise<void> => {
        if (canvas.tokens.controlled.length > 0) {
            const saveType = event.currentTarget.dataset.save;
            if (!tupleHasValue(SAVE_TYPES, saveType)) {
                throw ErrorPF2e(`"${saveType}" is not a recognized save type`);
            }

            const dc = Number($(event.currentTarget).attr("data-dc"));
            const itemTraits = item.system.traits?.value ?? [];
            for (const t of canvas.tokens.controlled) {
                const save = t.actor?.saves?.[saveType];
                if (!save) return;

                const rollOptions: string[] = [];
                if (item.isOfType("spell")) {
                    rollOptions.push("magical", "spell");
                    if (Object.keys(item.system.damage.value).length > 0) {
                        rollOptions.push("damaging-effect");
                    }
                }

                rollOptions.push(...itemTraits);

                save.check.roll({
                    ...eventToRollParams(event),
                    dc: !Number.isNaN(dc) ? { value: Number(dc) } : undefined,
                    item,
                    extraRollOptions: rollOptions,
                });
            }
        } else {
            ui.notifications.error(game.i18n.localize("PF2E.UI.errorTargetToken"));
        }
    },
};
