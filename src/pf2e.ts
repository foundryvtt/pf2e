import { ActorPF2e } from '@actor/index';
import { CheckPF2e } from '@system/rolls';
import { HooksPF2e } from '@scripts/hooks';

import '@system/measure';
import './styles/pf2e.scss';

HooksPF2e.listen();

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

// Chat hooks - refactor out.
/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on('getChatLogEntryContext', (_html, options) => {
    const canApplyDamage: ContextOptionCondition = (li) => {
        const messageId = li.attr('data-message-id') ?? '';
        const message = game.messages.get(messageId, { strict: true });

        return !!(canvas.tokens.controlled.length && message.isRoll && message.data.flavor?.includes('Damage'));
    };
    const canApplyHealing: ContextOptionCondition = (li) => {
        const messageId = li.attr('data-message-id') ?? '';
        const message = game.messages.get(messageId, { strict: true });

        return !!(
            canvas.tokens.controlled.length &&
            message.isRoll &&
            message.data &&
            message.data.flavor &&
            message.data.flavor.includes('Healing')
        );
    };
    const canApplyInitiative: ContextOptionCondition = (li) => {
        const messageId = li.attr('data-message-id') ?? '';
        const message = game.messages.get(messageId, { strict: true });

        // Rolling PC iniative from a regular skill is difficult because of bonuses that can apply to initiative specifically (e.g. Harmlessly Cute)
        // Avoid potential confusion and misunderstanding by just allowing NPCs to roll
        const validActor = canvas.tokens.controlled[0]?.actor?.data.type === 'npc';
        const validRollType =
            message.data.flavor?.includes('Skill Check') || message.data.flavor?.includes('Perception Check') || false;
        return validActor && message.isRoll && validRollType;
    };

    const canHeroPointReroll: ContextOptionCondition = (li): boolean => {
        const message = game.messages.get(li.data('messageId'), { strict: true });

        const actorId = message.data.speaker.actor ?? '';
        const actor = game.actors.get(actorId);
        const canReroll = !!message.getFlag('pf2e', 'canReroll');
        return (
            canReroll &&
            actor?.data.type === 'character' &&
            actor.isOwner &&
            actor.data.data.attributes.heroPoints?.rank >= 1 &&
            (message.isAuthor || game.user.isGM)
        );
    };
    const canReroll: ContextOptionCondition = (li): boolean => {
        const message = game.messages.get(li.data('messageId'), { strict: true });
        const actorId = message.data.speaker.actor ?? '';
        const isOwner = !!game.actors.get(actorId)?.isOwner;
        const canRerollMessage = !!message.getFlag('pf2e', 'canReroll');
        return canRerollMessage && isOwner && (message.isAuthor || game.user.isGM);
    };

    options.push(
        {
            name: 'Apply Damage',
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canApplyDamage,
            callback: (li: JQuery) => ActorPF2e.applyDamage(li, 1),
        },
        {
            name: 'Apply Healing',
            icon: '<i class="fas fa-user-plus"></i>',
            condition: canApplyHealing,
            callback: (li: JQuery) => ActorPF2e.applyDamage(li, -1),
        },
        {
            name: 'Double Damage',
            icon: '<i class="fas fa-user-injured"></i>',
            condition: canApplyDamage,
            callback: (li) => ActorPF2e.applyDamage(li, 2),
        },
        {
            name: 'Half Damage',
            icon: '<i class="fas fa-user-shield"></i>',
            condition: canApplyDamage,
            callback: (li) => ActorPF2e.applyDamage(li, 0.5),
        },
        {
            name: 'Set as Initiative',
            icon: '<i class="fas fa-fist-raised"></i>',
            condition: canApplyInitiative,
            callback: (li) => ActorPF2e.setCombatantInitiative(li),
        },
        {
            name: 'PF2E.RerollMenu.HeroPoint',
            icon: '<i class="fas fa-hospital-symbol"></i>',
            condition: canHeroPointReroll,
            callback: (li) =>
                CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId'), { strict: true }), {
                    heroPoint: true,
                }),
        },
        {
            name: 'PF2E.RerollMenu.KeepNew',
            icon: '<i class="fas fa-dice"></i>',
            condition: canReroll,
            callback: (li) => CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId'), { strict: true })),
        },
        {
            name: 'PF2E.RerollMenu.KeepWorst',
            icon: '<i class="fas fa-dice-one"></i>',
            condition: canReroll,
            callback: (li) =>
                CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId'), { strict: true }), {
                    keep: 'worst',
                }),
        },
        {
            name: 'PF2E.RerollMenu.KeepBest',
            icon: '<i class="fas fa-dice-six"></i>',
            condition: canReroll,
            callback: (li) =>
                CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId'), { strict: true }), {
                    keep: 'best',
                }),
        },
    );
});

// effect panel
Hooks.on('updateUser', () => {
    game.pf2e.effectPanel.refresh();
});

// world clock application
Hooks.on('getSceneControlButtons', (controls: any[]) => {
    controls
        .find((c) => c.name === 'token')
        .tools.push({
            name: 'worldclock',
            title: 'CONTROLS.WorldClock',
            icon: 'fas fa-clock',
            visible: game.user.isGM || game.settings.get('pf2e', 'worldClock.playersCanView'),
            onClick: () => game.pf2e.worldClock!.render(true),
            button: true,
        });
});

Hooks.on('renderChatMessage', (message, html) => {
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
            role === 'all' ||
            (role === 'gm' && game.user.isGM) ||
            (role === 'owner' && ((actor && actor.isOwner) || game.user.isGM || message.isAuthor))
        ) {
            elem.innerHTML = game.i18n.format('PF2E.DCWithValue', {
                dc,
                text: elem.innerHTML,
            });
            elem.removeAttribute('data-pf2-show-dc'); // short-circuit the global DC interpolation
        }
    });
});
