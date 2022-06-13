import { CharacterPF2e, NPCPF2e } from "@actor";
import { craftSpellConsumable } from "@actor/character/crafting/helpers";
import { SAVE_TYPES } from "@actor/data";
import { StrikeData } from "@actor/data/base";
import { StatisticModifier } from "@actor/modifiers";
import { ConsumablePF2e, ItemPF2e, MeleePF2e, PhysicalItemPF2e, SpellPF2e } from "@item";
import { isSpellConsumable } from "@item/consumable/spell-consumables";
import { CoinsPF2e } from "@item/physical/helpers";
import { eventToRollParams } from "@scripts/sheet-util";
import { onRepairChatCardEvent } from "@system/action-macros/crafting/repair";
import { LocalizePF2e } from "@system/localize";
import { ErrorPF2e, sluggify, tupleHasValue } from "@util";
import { ChatMessagePF2e } from "..";

export const ChatCards = {
    listen: ($html: JQuery) => {
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
                else if (action === "spellCounteract") spell?.rollCounteract(event);
                else if (action === "spellTemplate") spell?.placeTemplate();
                // Consumable usage
                else if (action === "consume") {
                    if (item instanceof ConsumablePF2e) {
                        item.consume();
                    } else if (item instanceof MeleePF2e) {
                        // Button is from an NPC attack effect
                        const consumable = actor.items.get($button.attr("data-item") ?? "");
                        if (consumable instanceof ConsumablePF2e) {
                            const oldQuant = consumable.quantity;
                            const toReplace = `${consumable.name} - ${LocalizePF2e.translations.ITEM.TypeConsumable} (${oldQuant})`;
                            await consumable.consume();
                            const currentQuant = oldQuant === 1 ? 0 : consumable.quantity;
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
                    ChatCards.rollActorSaves(event, item);
                }
            } else if (actor instanceof CharacterPF2e || actor instanceof NPCPF2e) {
                const strikeIndex = $card.attr("data-strike-index");
                const strikeName = $card.attr("data-strike-name");
                const altUsage = message.data.flags.pf2e.context?.altUsage ?? null;

                const strikeAction = ((): StrikeData | null => {
                    const action = actor.data.data.actions.at(Number(strikeIndex)) ?? null;
                    return altUsage
                        ? action?.altUsages?.find((w) => (altUsage === "thrown" ? w.item.isThrown : w.item.isMelee)) ??
                              null
                        : action;
                })();

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

                    if (isSpellConsumable(item.id)) {
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
                    itemObject.data.quantity = quantity;

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
                    if (item === null || !(item instanceof PhysicalItemPF2e)) return;
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
                }
            }
        });
    },

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     */
    rollActorSaves: async (ev: JQuery.ClickEvent, item: Embedded<ItemPF2e>): Promise<void> => {
        if (canvas.tokens.controlled.length > 0) {
            const save = $(ev.currentTarget).attr("data-save");
            if (!tupleHasValue(SAVE_TYPES, save)) {
                throw ErrorPF2e(`"${save}" is not a recognized save type`);
            }

            const dc = Number($(ev.currentTarget).attr("data-dc"));
            const itemTraits = item.data.data.traits?.value ?? [];
            for (const t of canvas.tokens.controlled) {
                const actor = t.actor;
                if (!actor) return;
                if (actor.saves) {
                    const rollOptions: string[] = [];
                    if (item instanceof SpellPF2e) {
                        rollOptions.push("magical", "spell");
                        if (Object.keys(item.data.data.damage.value).length > 0) {
                            rollOptions.push("damaging-effect");
                        }
                    }

                    if (itemTraits) {
                        rollOptions.push(...itemTraits);
                        rollOptions.push(...itemTraits.map((trait) => `trait:${trait}`));
                    }

                    actor.saves[save]?.check.roll({
                        ...eventToRollParams(ev),
                        dc: !Number.isNaN(dc) ? { value: Number(dc) } : undefined,
                        item,
                        extraRollOptions: rollOptions,
                    });
                } else {
                    actor.rollSave(ev, save);
                }
            }
        } else {
            ui.notifications.error(game.i18n.localize("PF2E.UI.errorTargetToken"));
        }
    },
};
