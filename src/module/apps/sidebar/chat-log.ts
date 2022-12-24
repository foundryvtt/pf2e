import { ChatMessagePF2e } from "@module/chat-message";
import { CheckPF2e } from "@system/check";
import { DamageRoll } from "@system/damage/roll";
import { ErrorPF2e, fontAwesomeIcon, objectHasKey } from "@util";

export class ChatLogPF2e extends ChatLog<ChatMessagePF2e> {
    /** Replace parent method in order to use DamageRoll class as needed */
    protected override async _processDiceCommand(
        command: string,
        matches: RegExpMatchArray[],
        chatData: DeepPartial<foundry.data.ChatMessageSource>,
        createOptions: ChatMessageModificationContext
    ): Promise<void> {
        const actor = ChatMessage.getSpeakerActor(chatData.speaker ?? {}) || game.user.character;
        const rollData = actor ? actor.getRollData() : {};
        const rolls: Rolled<Roll>[] = [];
        for (const match of matches.filter((m) => !!m)) {
            const [formula, flavor] = match.slice(2, 4);
            if (flavor && !chatData.flavor) chatData.flavor = flavor;
            const RollCls = formula.includes("d20") || /[0-9]dc\b/.test(formula) ? Roll : DamageRoll;
            const roll = await new RollCls(formula, rollData).evaluate({ async: true });
            rolls.push(roll);
        }
        chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
        chatData.rolls = rolls.map((r) => r.toJSON());
        chatData.sound = CONFIG.sounds.dice;
        chatData.content = rolls.reduce((t, r) => t + r.total, 0).toString();
        createOptions.rollMode = objectHasKey(CONFIG.Dice.rollModes, command) ? command : "publicroll";
    }

    protected override _getEntryContextOptions(): EntryContextOption[] {
        const canApplyDamage: ContextOptionCondition = ($html) => {
            const messageId = $html.attr("data-message-id") ?? "";
            const message = game.messages.get(messageId, { strict: true });

            return canvas.tokens.controlled.length > 0 && message.rolls.some((r) => r instanceof DamageRoll);
        };

        const canApplyTripleDamage: ContextOptionCondition = ($li) =>
            canApplyDamage($li) && $li.find("button.triple-damage").length === 1;

        const canApplyInitiative: ContextOptionCondition = ($li) => {
            const messageId = $li.attr("data-message-id") ?? "";
            const message = game.messages.get(messageId, { strict: true });

            // Rolling PC initiative from a regular skill is difficult because of bonuses that can apply to initiative specifically (e.g. Harmlessly Cute)
            // Avoid potential confusion and misunderstanding by just allowing NPCs to roll
            const validActor =
                message.token?.actor?.type === "npc" && (message.token.combatant?.initiative ?? null) === null;
            const validRollType = message.isRoll && message.isCheckRoll;
            return validActor && validRollType;
        };

        const canReroll: ContextOptionCondition = (li): boolean => {
            return game.messages.get(li.data("messageId"), { strict: true }).isRerollable;
        };

        const canHeroPointReroll: ContextOptionCondition = (li): boolean => {
            const message = game.messages.get(li.data("messageId"), { strict: true });
            const actor = message.actor;
            return message.isRerollable && !!actor?.isOfType("character") && actor.heroPoints.value > 0;
        };

        const canShowRollDetails: ContextOptionCondition = ($li): boolean => {
            const message = game.messages.get($li.data("messageId"), { strict: true });
            const rulesEnabled = game.settings.get("pf2e", "enabledRulesUI");
            return game.user.isGM && rulesEnabled && !!message.flags.pf2e.context;
        };

        const applyDamage = async ($li: JQuery, multiplier: number): Promise<void> => {
            const messageId = $li.attr("data-message-id") ?? "";
            const roll = game.messages.get(messageId, { strict: true }).rolls.at(0);
            if (!roll) return;
            for (const token of canvas.tokens.controlled) {
                await token.actor?.applyDamage(
                    roll.total * multiplier,
                    token.document,
                    CONFIG.PF2E.chatDamageButtonShieldToggle
                );
            }
        };

        const options = super._getEntryContextOptions();
        options.push(
            {
                name: "PF2E.ChatRollDetails.Select",
                icon: fontAwesomeIcon("search").outerHTML,
                condition: canShowRollDetails,
                callback: ($li) => {
                    const message = game.messages.get($li.attr("data-message-id") ?? "", { strict: true });
                    message.showDetails();
                },
            },
            {
                name: "PF2E.DamageButton.FullContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: (li: JQuery) => applyDamage(li, 1),
            },
            {
                name: "PF2E.DamageButton.HalfContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: (li) => applyDamage(li, 0.5),
            },
            {
                name: "PF2E.DamageButton.DoubleContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyDamage,
                callback: (li) => applyDamage(li, 2),
            },
            {
                name: "PF2E.DamageButton.TripleContext",
                icon: fontAwesomeIcon("heart-broken").outerHTML,
                condition: canApplyTripleDamage,
                callback: (li) => applyDamage(li, 3),
            },
            {
                name: "PF2E.DamageButton.HealingContext",
                icon: fontAwesomeIcon("heart").outerHTML,
                condition: canApplyDamage,
                callback: (li: JQuery) => applyDamage(li, -1),
            },
            {
                name: "PF2E.ClickToSetInitiativeContext",
                icon: fontAwesomeIcon("swords").outerHTML,
                condition: canApplyInitiative,
                callback: ($li) => {
                    const message = game.messages.get($li.attr("data-message-id") ?? "", { strict: true });
                    const roll = message.rolls.at(0);
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
                icon: fontAwesomeIcon("hospital-symbol").outerHTML,
                condition: canHeroPointReroll,
                callback: (li) =>
                    CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true }), {
                        heroPoint: true,
                    }),
            },
            {
                name: "PF2E.RerollMenu.KeepNew",
                icon: fontAwesomeIcon("dice").outerHTML,
                condition: canReroll,
                callback: (li) =>
                    CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true })),
            },
            {
                name: "PF2E.RerollMenu.KeepWorst",
                icon: fontAwesomeIcon("dice-one").outerHTML,
                condition: canReroll,
                callback: (li) =>
                    CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true }), {
                        keep: "worst",
                    }),
            },
            {
                name: "PF2E.RerollMenu.KeepBest",
                icon: fontAwesomeIcon("dice-six").outerHTML,
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
