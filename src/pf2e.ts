import DOMPurify from 'dompurify';
import { CheckPF2e } from './module/system/rolls';
import { EffectPanel } from './module/system/effect-panel';
import { ActionElement } from './module/custom-elements/action';
import { RuleElements } from './module/rules/rules';
import { updateMinionActors } from './scripts/actor/update-minions';
import { PF2E } from './scripts/hooks';
import { ItemDataPF2e } from '@item/data-definitions';
import { ItemPF2e } from './module/item/base';
import { ActorPF2e } from './module/actor/base';
import { NPCPF2e } from './module/actor/npc';

import './styles/pf2e.scss';

// load in the scripts (that were previously just included by <script> tags instead of in the bundle
require('./scripts/init.ts');
require('./scripts/actor/status-effects.ts');
require('./scripts/dice.ts');
require('./scripts/chat/chat-damage-buttons-pf2e.ts');
require('./scripts/chat/crit-fumble-cards.ts');
require('./scripts/actor/sheet/item-behaviour.ts');
require('./scripts/system/canvas-drop-handler');
require('./module/custom-elements/custom-elements');

PF2E.Hooks.listen();

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

// Activate global listeners
Hooks.on('renderChatLog', (log, html) => ItemPF2e.chatListeners(html));
Hooks.on('renderChatPopout', (log, html) => ItemPF2e.chatListeners(html));

// Chat hooks - refactor out.
/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on('getChatLogEntryContext', (html, options) => {
    const canApplyDamage = (li) => {
        const { messageId } = li.data();
        const message = game.messages.get(messageId);

        return (
            canvas.tokens.controlled.length &&
            message.isRoll &&
            message.data &&
            message.data.flavor &&
            message.data.flavor.includes('Damage')
        );
    };
    const canApplyHealing = (li) => {
        const { messageId } = li.data();
        const message = game.messages.get(messageId);

        return (
            canvas.tokens.controlled.length &&
            message.isRoll &&
            message.data &&
            message.data.flavor &&
            message.data.flavor.includes('Healing')
        );
    };
    const canApplyInitiative = (li) => {
        const { messageId } = li.data();
        const message = game.messages.get(messageId);

        // Rolling PC iniative from a regular skill is difficult because of bonuses that can apply to initiative specifically (e.g. Harmlessly Cute)
        // Avoid potential confusion and misunderstanding by just allowing NPCs to roll
        const validActor = canvas.tokens.controlled?.[0]?.actor?.data?.type === 'npc' ?? false;
        const validRollType =
            (message?.data?.flavor?.includes('Skill Check') || message?.data?.flavor?.includes('Perception Check')) ??
            false;
        return validActor && message.isRoll && validRollType;
    };

    const canHeroPointReroll = (li): boolean => {
        const message = game.messages.get(li.data('messageId'));
        const actorId = message.data.speaker.actor;
        const canReroll = message.getFlag('pf2e', 'canReroll');
        if (canReroll && actorId) {
            const actor = game.actors.get(actorId);
            return (
                actor.owner && actor.data.data.attributes.heroPoints?.rank >= 1 && (message.isAuthor || game.user.isGM)
            );
        }
        return false;
    };
    const canReroll = (li): boolean => {
        const message = game.messages.get(li.data('messageId'));
        const actorId = message.data.speaker.actor;
        const canRerollMessage = message.getFlag('pf2e', 'canReroll');
        if (canRerollMessage && actorId) {
            const actor = game.actors.get(actorId);
            return actor.owner && (message.isAuthor || game.user.isGM);
        }
        return false;
    };

    options.push(
        {
            name: 'Apply Damage',
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canApplyDamage,
            callback: (li) => ActorPF2e.applyDamage(li, 1),
        },
        {
            name: 'Apply Healing',
            icon: '<i class="fas fa-user-plus"></i>',
            condition: canApplyHealing,
            callback: (li) => ActorPF2e.applyDamage(li, -1),
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
            callback: (li) => CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId')), { heroPoint: true }),
        },
        {
            name: 'PF2E.RerollMenu.KeepNew',
            icon: '<i class="fas fa-dice"></i>',
            condition: canReroll,
            callback: (li) => CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId'))),
        },
        {
            name: 'PF2E.RerollMenu.KeepWorst',
            icon: '<i class="fas fa-dice-one"></i>',
            condition: canReroll,
            callback: (li) => CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId')), { keep: 'worst' }),
        },
        {
            name: 'PF2E.RerollMenu.KeepBest',
            icon: '<i class="fas fa-dice-six"></i>',
            condition: canReroll,
            callback: (li) => CheckPF2e.rerollFromMessage(game.messages.get(li.data('messageId')), { keep: 'best' }),
        },
    );
    return options;
});

Hooks.on('preCreateItem', (itemData: Partial<ItemDataPF2e>) => {
    itemData.img = (() => {
        if (itemData.img !== undefined) {
            return itemData.img;
        }
        return CONFIG.PF2E.Item.entityClasses[itemData.type].defaultImg;
    })();
});

Hooks.on('updateActor', (actor, data, options, userID) => {
    if (userID === game.userId) {
        // ensure minion-type actors with the updated actor as master should also be updated
        updateMinionActors(actor);
    }
});

function preCreateOwnedItem(parent, child, options, userID) {
    if (userID === game.userId) {
        if (child.type === 'effect') {
            child.data.start = child.data.start || {};
            child.data.start.value = game.time.worldTime;

            if (game.combat && game.combat.turns?.length > game.combat.turn) {
                child.data.start.initiative = game.combat.turns[game.combat.turn].initiative;
            } else {
                child.data.start.initiative = null;
            }
        }
    }
}

Hooks.on('preCreateOwnedItem', preCreateOwnedItem);

function createOwnedItem(parent, child, options, userID) {
    if (parent instanceof ActorPF2e) {
        if (userID === game.userId) {
            parent.onCreateOwnedItem(child, options, userID);
        }

        game.pf2e.effectPanel?.refresh();
    }
}

Hooks.on('createOwnedItem', createOwnedItem);

function deleteOwnedItem(parent, child, options, userID) {
    if (parent instanceof ActorPF2e) {
        if (userID === game.userId) {
            parent.onDeleteOwnedItem(child, options, userID);
        }

        game.pf2e.effectPanel?.refresh();
    }
}

Hooks.on('deleteOwnedItem', deleteOwnedItem);

Hooks.on('updateOwnedItem', (parent, child, options, userId) => {
    if (parent instanceof ActorPF2e) {
        game.pf2e.effectPanel?.refresh();
    }
});

// effect panel
Hooks.on('updateUser', (user, diff, options, id) => {
    game.pf2e.effectPanel?.refresh();
});

Hooks.on('preCreateToken', (scene: Scene, token: TokenData, options, userId) => {
    const actor = game.actors.get(token.actorId);
    if (actor) {
        actor.items.forEach((item: ItemPF2e) => {
            const rules = RuleElements.fromRuleElementData(item?.data?.data?.rules ?? [], item.data);
            for (const rule of rules) {
                rule.onCreateToken(actor.data, item.data, token);
            }
        });
    }
});

Hooks.on('preUpdateToken', (scene, token, data, options, userID) => {
    if (!token.actorLink && data.actorData?.items) {
        // Preparation for synthetic actors to fake some of the other hooks in the 'updateToken' hook where this data is
        // not otherwise available
        options.pf2e = {
            items: {
                added:
                    data.actorData.items?.filter((i) => !token.actorData.items?.map((x) => x._id)?.includes(i._id)) ??
                    [],
                removed:
                    token.actorData.items?.filter((i) => !data.actorData.items?.map((x) => x._id)?.includes(i._id)) ??
                    [],
            },
        };
        const canvasToken = canvas.tokens.get(token._id);
        if (canvasToken) {
            options.pf2e.items.added.forEach((item) => {
                preCreateOwnedItem(canvasToken.actor, item, options, userID);
            });
        }
    }
});

Hooks.on('updateToken', (scene, token: TokenData, data, options, userID) => {
    if (!token.actorLink && options.pf2e?.items) {
        // Synthetic actors do not trigger the 'createOwnedItem' and 'deleteOwnedItem' hooks, so use the previously
        // prepared data from the 'preUpdateToken' hook to trigger the callbacks from here instead
        const canvasToken = canvas.tokens.get(token._id);
        if (canvasToken) {
            const actor = canvasToken.actor;
            options.pf2e.items.added.forEach((item) => {
                createOwnedItem(actor, item, options, userID);
            });
            options.pf2e.items.removed.forEach((item) => {
                deleteOwnedItem(actor, item, options, userID);
            });
        }
    }

    if ('disposition' in data && game.userId === userID) {
        const canvasToken = canvas.tokens.get(token._id);
        if (canvasToken) {
            const actor = canvasToken.actor;
            if (actor instanceof NPCPF2e) {
                (actor as NPCPF2e).updateNPCAttitudeFromDisposition(data.disposition);
            }
        }
    }

    game.pf2e.effectPanel?.refresh();
});

Hooks.on('controlToken', (_token: Token, _selected: boolean) => {
    if (game.pf2e.effectPanel instanceof EffectPanel) {
        game.pf2e.effectPanel.refresh();
    }
});

// world clock application
Hooks.on('getSceneControlButtons', (controls: any[]) => {
    controls
        .find((c) => c.name === 'token')
        .tools.push(
            {
                name: 'effectpanel',
                title: 'CONTROLS.EffectPanel',
                icon: 'fas fa-star',
                onClick: (toggled: boolean) => {
                    if (toggled) {
                        game.pf2e.effectPanel?.render(true);
                    } else {
                        game.pf2e.effectPanel?.close();
                    }
                    game.user.setFlag(game.system.id, 'showEffectPanel', toggled);
                },
                active: !!(game.user.getFlag(game.system.id, 'showEffectPanel') ?? true),
                toggle: true,
            },
            {
                name: 'worldclock',
                title: 'CONTROLS.WorldClock',
                icon: 'fas fa-clock',
                visible: game.user.isGM || game.settings.get('pf2e', 'worldClock.playersCanView'),
                onClick: () => game.pf2e.worldClock!.render(true),
                button: true,
            },
        );
});

Hooks.on('updateCombat', (combat, diff, options, userID) => {
    game.pf2e.effectPanel.refresh();
});

Hooks.on('renderChatMessage', (message: ChatMessage, html: JQuery) => {
    if (message.data.flags[game.system.id]?.unsafe) {
        const unsafe = message.data.flags[game.system.id].unsafe;

        // strip out script tags to prevent cross-site scripting
        const safe = DOMPurify.sanitize(unsafe, {
            ADD_TAGS: [ActionElement.tagName],
            ADD_ATTR: [...ActionElement.observedAttributes],
        });

        html.find('.flavor-text').html(safe);
    }

    // remove elements the user does not have permission to see
    if (!game.user.isGM) {
        html.find('[data-visibility="gm"]').remove();
    }

    const actor = message.data.speaker?.actor ? game.actors.get(message.data.speaker.actor) : undefined;
    if (!((actor && actor.owner) || game.user.isGM || message.isAuthor)) {
        html.find('[data-visibility="owner"]').remove();
    }
});
