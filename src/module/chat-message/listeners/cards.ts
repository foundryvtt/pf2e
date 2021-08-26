import { ConsumablePF2e, FormulaPF2e, MeleePF2e, PhysicalItemPF2e, SpellPF2e } from "@item/index";
import { ActorPF2e, CharacterPF2e } from "@actor/index";
import { StatisticModifier } from "@module/modifiers";
import { attemptToRemoveCoinsByValue, coinsToString } from "@item/treasure/helpers";
import { CraftingResult, performRoll } from "@module/crafting";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables";

export const ChatCards = {
    listen: ($html: JQuery) => {
        $html.find(".card-buttons button").on("click", async (event) => {
            event.preventDefault();

            // Extract card data
            const button = $(event.currentTarget);
            const messageId = button.parents(".message").attr("data-message-id") ?? "";
            const message = game.messages.get(messageId);
            const senderId = message?.user?.id ?? "";
            const card = button.parents(".chat-card");
            const action = button.attr("data-action");

            // Confirm roll permission
            if (!game.user.isGM && game.user.id !== senderId && action !== "save") return;

            // Get the actor and item from the chat message
            const item = message?.item;
            const actor = item?.actor ?? message?.actor;
            if (!actor) return;

            if (item) {
                const spell =
                    item instanceof SpellPF2e ? item : item instanceof ConsumablePF2e ? item.embeddedSpell : null;
                const strike: StatisticModifier = actor.data.data.actions?.find(
                    (a: StatisticModifier) => a.item === item.id
                );
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
                else if (action === "consume" && item instanceof ConsumablePF2e) item.consume();
                else if (action === "save") ActorPF2e.rollSave(event, item);
                else if (action === "craft") actor.data.data.skills["cra"].roll({ event });
            } else {
                const strikeIndex = card.attr("data-strike-index");
                const strikeName = card.attr("data-strike-name");
                const strikeAction = actor.data.data.actions[Number(strikeIndex)];

                if (strikeAction && strikeAction.name === strikeName) {
                    const options = (actor as ActorPF2e).getRollOptions(["all", "attack-roll"]);
                    if (action === "strikeAttack") strikeAction.variants[0].roll({ event: event, options });
                    else if (action === "strikeAttack2") strikeAction.variants[1].roll({ event: event, options });
                    else if (action === "strikeAttack3") strikeAction.variants[2].roll({ event: event, options });
                    else if (action === "strikeDamage") strikeAction.damage({ event: event, options });
                    else if (action === "strikeCritical") strikeAction.critical({ event: event, options });
                }

                const formulaId = card.attr("data-item-id");
                const formula = actor.data.items.find((i) => i.id === formulaId) as FormulaPF2e;
                if (formula === undefined) return;
                const craftingResultString = card.attr("data-crafting-result");
                if (craftingResultString === undefined) return;
                const craftingResult = JSON.parse(craftingResultString) as CraftingResult;
                if (craftingResult === undefined) return;

                if (action === "finish-crafting") {
                    const item = await fromUuid(formula.data.data.craftedObjectUuid.value);

                    let itemObject;
                    if (item instanceof SpellPF2e && formula.data.data.magicConsumable) {
                        const data = formula.data.data.magicConsumable;
                        itemObject = await createConsumableFromSpell(data.type, item.toObject(), data.heightenedLevel);
                    } else if (item instanceof PhysicalItemPF2e) {
                        itemObject = item.toObject();
                    } else {
                        return;
                    }
                    itemObject.data.quantity.value = craftingResult.form.quantity;

                    const result = await actor.addItemToActor(itemObject, undefined);
                    if (!result) {
                        ui.notifications.warn("Could not add items");
                        return;
                    }

                    ChatMessage.create({
                        user: game.user.id,
                        content: `${actor.name} receives ${craftingResult.form.quantity}x ${item.name}.`,
                        speaker: { alias: actor.name },
                    });
                } else if (action == "pay-crafting-costs") {
                    const coinsToRemove = button.hasClass("full")
                        ? craftingResult.costs.itemPrice
                        : craftingResult.costs.materials;
                    if (
                        !(await attemptToRemoveCoinsByValue({
                            actor: actor,
                            coinsToRemove: coinsToRemove,
                        }))
                    ) {
                        ui.notifications.warn("Insufficient coins");
                        return;
                    }
                    ChatMessage.create({
                        user: game.user.id,
                        content: `${actor.name} pays ${coinsToString(coinsToRemove)} crafting costs.`,
                        speaker: { alias: actor.name },
                    });
                } else if (action === "lose-materials") {
                    if (
                        !(await attemptToRemoveCoinsByValue({
                            actor: actor,
                            coinsToRemove: craftingResult.costs.lostMaterials,
                        }))
                    ) {
                        ui.notifications.warn("Insufficient coins");
                    } else {
                        ChatMessage.create({
                            user: game.user.id,
                            content: actor.name + " loses materials.",
                            speaker: { alias: actor.name },
                        });
                    }
                } else if (action === "retry-crafting")
                    performRoll(actor as CharacterPF2e, formula.data, event, craftingResult.form);
            }
        });
    },
};
