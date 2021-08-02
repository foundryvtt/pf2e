import { ConsumablePF2e, MeleePF2e } from "@item/index";
import { ActorPF2e } from "@actor/index";
import { StatisticModifier } from "@module/modifiers";

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
                const strike: StatisticModifier = actor.data.data.actions?.find(
                    (a: StatisticModifier) => a.item === item.id
                );
                const rollOptions = actor.getRollOptions(["all", "attack-roll"]);

                if (action === "weaponAttack") {
                    if (strike && rollOptions) {
                        strike.variants[0].roll({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(event);
                    }
                } else if (action === "weaponAttack2") {
                    if (strike && rollOptions) {
                        strike.variants[1].roll({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(event, 2);
                    }
                } else if (action === "weaponAttack3") {
                    if (strike && rollOptions) {
                        strike.variants[2].roll({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponAttack(event, 3);
                    }
                } else if (action === "weaponDamage") {
                    if (strike && rollOptions) {
                        strike.damage({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponDamage(event);
                    }
                } else if (action === "weaponDamageCritical" || action === "criticalDamage") {
                    if (strike && rollOptions) {
                        strike.critical({ event: event, options: rollOptions });
                    } else {
                        item.rollWeaponDamage(event, true);
                    }
                } else if (action === "npcAttack" && item instanceof MeleePF2e) item.rollNPCAttack(event);
                else if (action === "npcAttack2" && item instanceof MeleePF2e) item.rollNPCAttack(event, 2);
                else if (action === "npcAttack3" && item instanceof MeleePF2e) item.rollNPCAttack(event, 3);
                else if (action === "npcDamage" && item instanceof MeleePF2e) item.rollNPCDamage(event);
                else if (action === "npcDamageCritical" && item instanceof MeleePF2e) item.rollNPCDamage(event, true);
                // Spell actions
                else if (action === "spellAttack") item.rollSpellAttack(event);
                else if (action === "spellAttack2") item.rollSpellAttack(event, 2);
                else if (action === "spellAttack3") item.rollSpellAttack(event, 3);
                else if (action === "spellDamage") item.rollSpellDamage(event);
                else if (action === "spellCounteract") item.rollCounteract(event);
                else if (action === "spellTemplate") item.placeTemplate(event);
                // Consumable usage
                else if (action === "consume" && item instanceof ConsumablePF2e) item.consume();
                else if (action === "save") ActorPF2e.rollSave(event, item);
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
            }
        });
    },
};
