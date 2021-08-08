import { ActorPF2e } from "@actor/index";
import { CheckPF2e } from "@system/rolls";
import { HooksPF2e } from "@scripts/hooks";

import "@system/measure";
import "./styles/pf2e.scss";

HooksPF2e.listen();

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

// Chat hooks - refactor out.
/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on("getChatLogEntryContext", (_html, options) => {
    const canApplyDamage: ContextOptionCondition = ($li) => {
        const messageId = $li.attr("data-message-id") ?? "";
        const message = game.messages.get(messageId, { strict: true });

        return canvas.tokens.controlled.length > 0 && message.isRoll && $li.find(".chat-damage-buttons").length === 1;
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
        const canReroll = !!message.getFlag("pf2e", "canReroll");
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
        const canRerollMessage = !!message.getFlag("pf2e", "canReroll");
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
            callback: (li) => ActorPF2e.applyDamage(li, 2),
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
            callback: (li) => CheckPF2e.rerollFromMessage(game.messages.get(li.data("messageId"), { strict: true })),
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
});

// world clock application
Hooks.on("getSceneControlButtons", (controls: any[]) => {
    controls
        .find((c) => c.name === "token")
        .tools.push({
            name: "worldclock",
            title: "CONTROLS.WorldClock",
            icon: "fas fa-clock",
            visible:
                game.settings.get("pf2e", "worldClock.showClockButton") &&
                (game.user.isGM || game.settings.get("pf2e", "worldClock.playersCanView")),
            onClick: () => game.pf2e.worldClock!.render(true),
            button: true,
        });
});

Hooks.on("renderChatMessage", (message, html) => {
    // remove elements the user does not have permission to see
    html.find('[data-visibility="none"]').remove();

    if (!game.user.isGM) {
        html.find('[data-visibility="gm"]').remove();
    }

    const actor = message.data.speaker?.actor ? game.actors.get(message.data.speaker.actor) : undefined;
    if (!((actor && actor.isOwner) || game.user.isGM || message.isAuthor)) {
        html.find('[data-visibility="owner"]').remove();
    }

    // show DC for inline checks if user has sufficient permission
    html.find('[data-pf2-dc]:not([data-pf2-dc=""])[data-pf2-show-dc]:not([data-pf2-show-dc=""])').each((_idx, elem) => {
        const dc = elem.dataset.pf2Dc!.trim()!;
        const role = elem.dataset.pf2ShowDc!.trim();
        if (
            role === "all" ||
            (role === "gm" && game.user.isGM) ||
            (role === "owner" && ((actor && actor.isOwner) || game.user.isGM || message.isAuthor))
        ) {
            elem.innerHTML = game.i18n.format("PF2E.DCWithValue", {
                dc,
                text: elem.innerHTML,
            });
            elem.removeAttribute("data-pf2-show-dc"); // short-circuit the global DC interpolation
        }
    });
});
