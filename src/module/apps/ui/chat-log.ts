import { CharacterPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";
import { CheckPF2e } from "@system/rolls";
import { ErrorPF2e } from "@util";

export class ChatLogPF2e extends ChatLog<ChatMessagePF2e> {
    protected override _getEntryContextOptions(): EntryContextOption[] {
        const canApplyDamage: ContextOptionCondition = ($html) => {
            const messageId = $html.attr("data-message-id") ?? "";
            const message = game.messages.get(messageId, { strict: true });

            return (
                canvas.tokens.controlled.length > 0 && message.isRoll && $html.find(".chat-damage-buttons").length === 1
            );
        };

        const canApplyTripleDamage: ContextOptionCondition = ($li) =>
            canApplyDamage($li) && $li.find("button.triple-damage").length === 1;

        const canApplyInitiative: ContextOptionCondition = ($li) => {
            const messageId = $li.attr("data-message-id") ?? "";
            const message = game.messages.get(messageId, { strict: true });

            // Rolling PC initiative from a regular skill is difficult because of bonuses that can apply to initiative specifically (e.g. Harmlessly Cute)
            // Avoid potential confusion and misunderstanding by just allowing NPCs to roll
            const validActor =
                message.token?.actor?.data.type === "npc" && (message.token.combatant?.initiative ?? null) === null;
            const validRollType = message.isRoll && message.isCheckRoll;
            return validActor && validRollType;
        };

        const canReroll: ContextOptionCondition = (li): boolean => {
            return game.messages.get(li.data("messageId"), { strict: true }).isRerollable;
        };

        const canHeroPointReroll: ContextOptionCondition = (li): boolean => {
            const message = game.messages.get(li.data("messageId"), { strict: true });
            const actorId = message.data.speaker.actor ?? "";
            const actor = game.actors.get(actorId);
            return message.isRerollable && actor instanceof CharacterPF2e && actor.heroPoints.value > 0;
        };

        const canShowRollDetails: ContextOptionCondition = ($li): boolean => {
            const message = game.messages.get($li.data("messageId"), { strict: true });
            const rulesEnabled = game.settings.get("pf2e", "enabledRulesUI");
            return game.user.isGM && rulesEnabled && !!message.data.flags.pf2e.context;
        };

        const applyDamage = async ($li: JQuery, multiplier: number): Promise<void> => {
            const messageId = $li.attr("data-message-id") ?? "";
            const roll = game.messages.get(messageId, { strict: true }).roll;
            if (!roll) return;
            for await (const token of canvas.tokens.controlled) {
                if (!token.actor) continue;
                await token.actor.applyDamage(roll.total * multiplier, token, CONFIG.PF2E.chatDamageButtonShieldToggle);
            }
        };

        const options = super._getEntryContextOptions();
        options.push(
            {
                name: "PF2E.ChatRollDetails.Select",
                icon: '<i class="fas fa-search"></i>',
                condition: canShowRollDetails,
                callback: ($li) => {
                    const message = game.messages.get($li.attr("data-message-id") ?? "", { strict: true });
                    message.showDetails();
                },
            },
            {
                name: "PF2E.DamageButton.FullContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyDamage,
                callback: (li: JQuery) => applyDamage(li, 1),
            },
            {
                name: "PF2E.DamageButton.HalfContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyDamage,
                callback: (li) => applyDamage(li, 0.5),
            },
            {
                name: "PF2E.DamageButton.DoubleContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyDamage,
                callback: (li) => applyDamage(li, 2),
            },
            {
                name: "PF2E.DamageButton.TripleContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyTripleDamage,
                callback: (li) => applyDamage(li, 3),
            },
            {
                name: "PF2E.DamageButton.HealingContext",
                icon: '<i class="fas fa-heart"></i>',
                condition: canApplyDamage,
                callback: (li: JQuery) => applyDamage(li, -1),
            },
            {
                name: "PF2E.ClickToSetInitiativeContext",
                icon: '<i class="fas fa-fist-raised"></i>',
                condition: canApplyInitiative,
                callback: ($li) => {
                    const message = game.messages.get($li.attr("data-message-id") ?? "", { strict: true });
                    const roll = message.isRoll ? message.roll : null;
                    if (!roll || Number.isNaN(roll.total || "NaN")) throw ErrorPF2e("No roll found");

                    const token = message.token;
                    if (!token) {
                        ui.notifications.error(
                            game.i18n.format("PF2E.Encounter.NoTokenInScene", {
                                actor: message.actor?.name ?? message.user?.name ?? "",
                            })
                        );
                        return;
                    }

                    token.setInitiative({ initiative: roll.total });
                },
            },
            {
                name: "PF2E.RerollMenu.HeroPoint",
                icon: '<i class="fas fa-hospital-symbol"></i>',
                condition: canHeroPointReroll,
                callback: (li) =>
                    CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true }), {
                        heroPoint: true,
                    }),
            },
            {
                name: "PF2E.RerollMenu.KeepNew",
                icon: '<i class="fas fa-dice"></i>',
                condition: canReroll,
                callback: (li) =>
                    CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true })),
            },
            {
                name: "PF2E.RerollMenu.KeepWorst",
                icon: '<i class="fas fa-dice-one"></i>',
                condition: canReroll,
                callback: (li) =>
                    CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true }), {
                        keep: "worst",
                    }),
            },
            {
                name: "PF2E.RerollMenu.KeepBest",
                icon: '<i class="fas fa-dice-six"></i>',
                condition: canReroll,
                callback: (li) =>
                    CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true }), {
                        keep: "best",
                    }),
            }
        );

        return options;
    }
}
