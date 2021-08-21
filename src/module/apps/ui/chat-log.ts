import { ActorPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";
import { CheckPF2e } from "@system/rolls";

export class ChatLogPF2e extends ChatLog<ChatMessagePF2e> {
    protected override _getEntryContextOptions(): EntryContextOption[] {
        const options = super._getEntryContextOptions();

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
            const validActor = canvas.tokens.controlled[0]?.actor?.data.type === "npc";
            const validRollType = $li.find(".dice-total-setInitiative-btn").length > 0;
            return validActor && message.isRoll && validRollType;
        };

        const canHeroPointReroll: ContextOptionCondition = (li): boolean => {
            const message = game.messages.get(li.data("messageId"), { strict: true });

            const actorId = message.data.speaker.actor ?? "";
            const actor = game.actors.get(actorId);
            const canReroll = !message.getFlag("pf2e", "context")?.isReroll === true;
            return (
                canReroll &&
                actor?.data.type === "character" &&
                actor.isOwner &&
                actor.data.data.attributes.heroPoints?.rank >= 1 &&
                (message.isAuthor || game.user.isGM)
            );
        };
        const canReroll: ContextOptionCondition = (li): boolean => {
            const message = game.messages.get(li.data("messageId"), { strict: true });
            const actorId = message.data.speaker.actor ?? "";
            const isOwner = !!game.actors.get(actorId)?.isOwner;
            const canRerollMessage = !message.getFlag("pf2e", "context")?.isReroll === true;
            return canRerollMessage && isOwner && (message.isAuthor || game.user.isGM);
        };

        options.push(
            {
                name: "PF2E.DamageButton.FullContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyDamage,
                callback: (li: JQuery) => ActorPF2e.applyDamage(li, 1),
            },
            {
                name: "PF2E.DamageButton.HalfContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyDamage,
                callback: (li) => ActorPF2e.applyDamage(li, 0.5),
            },
            {
                name: "PF2E.DamageButton.DoubleContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyDamage,
                callback: (li) => ActorPF2e.applyDamage(li, 2),
            },
            {
                name: "PF2E.DamageButton.TripleContext",
                icon: '<i class="fas fa-heart-broken"></i>',
                condition: canApplyTripleDamage,
                callback: (li) => ActorPF2e.applyDamage(li, 3),
            },
            {
                name: "PF2E.DamageButton.HealingContext",
                icon: '<i class="fas fa-heart"></i>',
                condition: canApplyDamage,
                callback: (li: JQuery) => ActorPF2e.applyDamage(li, -1),
            },
            {
                name: "PF2E.ClickToSetInitiativeContext",
                icon: '<i class="fas fa-fist-raised"></i>',
                condition: canApplyInitiative,
                callback: (li) => ActorPF2e.setCombatantInitiative(li),
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
