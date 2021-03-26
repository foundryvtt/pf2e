import { CheckPF2e } from './module/system/rolls';
import { RuleElements } from './module/rules/rules';
import { updateMinionActors } from './scripts/actor/update-minions';
import { PF2E } from './scripts/hooks';
import { ItemDataPF2e } from '@item/data-definitions';
import { ItemPF2e } from './module/item/base';
import { ActorPF2e } from './module/actor/base';
import { NPCPF2e } from './module/actor/npc';

import '@system/measure';
import './styles/pf2e.scss';

// load in the scripts (that were previously just included by <script> tags instead of in the bundle
require('./scripts/dice.ts');
require('./scripts/chat/crit-fumble-cards.ts');
require('./scripts/actor/sheet/item-behaviour.ts');
require('./scripts/system/canvas-drop-handler');

PF2E.Hooks.listen();

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

// Activate global listeners
Hooks.on('renderChatLog', (_log, html) => ItemPF2e.chatListeners(html));
Hooks.on('renderChatPopout', (_log, html) => ItemPF2e.chatListeners(html));

// Chat hooks - refactor out.
/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on('getChatLogEntryContext', (_html, options) => {
    const canApplyDamage: ContextOptionCondition = (li) => {
        const { messageId } = li.data();
        const message = game.messages.get(messageId);

        return !!(
            canvas.tokens.controlled.length &&
            message.isRoll &&
            message.data &&
            message.data.flavor &&
            message.data.flavor.includes('Damage')
        );
    };
    const canApplyHealing: ContextOptionCondition = (li) => {
        const { messageId } = li.data();
        const message = game.messages.get(messageId);

        return !!(
            canvas.tokens.controlled.length &&
            message.isRoll &&
            message.data &&
            message.data.flavor &&
            message.data.flavor.includes('Healing')
        );
    };
    const canApplyInitiative: ContextOptionCondition = (li) => {
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

    const canHeroPointReroll: ContextOptionCondition = (li): boolean => {
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
    const canReroll: ContextOptionCondition = (li): boolean => {
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
});

Hooks.on('preCreateItem', (itemData: Partial<ItemDataPF2e>) => {
    itemData.img = (() => {
        if (itemData.img !== undefined) {
            return itemData.img;
        }
        return CONFIG.PF2E.Item.entityClasses[itemData.type].defaultImg;
    })();
});

Hooks.on('updateActor', (actor, _data, _options, userID) => {
    if (userID === game.userId) {
        // ensure minion-type actors with the updated actor as master should also be updated
        updateMinionActors(actor);
    }
});

function preCreateOwnedItem(
    _parent: ActorPF2e,
    child: DeepPartial<ItemDataPF2e>,
    _options: EntityCreateOptions,
    userID: string,
) {
    if (userID === game.userId) {
        if (child.type === 'effect') {
            const data = child.data!;
            data.start = data.start ?? { value: 0, initiative: null };
            data.start!.value = game.time.worldTime;

            if (game.combat && game.combat.turns?.length > game.combat.turn) {
                data.start!.initiative = game.combat.turns[game.combat.turn].initiative;
            }
        }
    }
}

Hooks.on('preCreateOwnedItem', preCreateOwnedItem);

function createOwnedItem(parent: ActorPF2e | null, child: ItemDataPF2e, options: EntityCreateOptions, userID: string) {
    if (parent instanceof ActorPF2e) {
        if (userID === game.userId) {
            parent.onCreateOwnedItem(child, options, userID);
        }

        game.pf2e.effectPanel?.refresh();
    }
}

Hooks.on('createOwnedItem', createOwnedItem);

function deleteOwnedItem(parent: ActorPF2e | null, child: ItemDataPF2e, options: EntityDeleteOptions, userID: string) {
    if (parent instanceof ActorPF2e) {
        if (userID === game.userId) {
            parent.onDeleteOwnedItem(child, options, userID);
        }

        game.pf2e.effectPanel?.refresh();
    }
}

Hooks.on('deleteOwnedItem', deleteOwnedItem);

Hooks.on('updateOwnedItem', (parent) => {
    if (parent instanceof ActorPF2e) {
        game.pf2e.effectPanel?.refresh();
    }
});

// effect panel
Hooks.on('updateUser', () => {
    game.pf2e.effectPanel?.refresh();
});

Hooks.on('preCreateToken', (_scene: Scene, token: TokenData) => {
    const actor = game.actors.get(token.actorId);
    if (actor) {
        actor.items.forEach((item) => {
            const rules = RuleElements.fromRuleElementData(item.data.data.rules ?? [], item.data);
            for (const rule of rules) {
                rule.onCreateToken(actor.data, item.data, token);
            }
        });
    }
});

Hooks.on('preUpdateToken', (_scene, token, data, options, userID) => {
    if (!token.actorLink && data.actorData?.items) {
        // Preparation for synthetic actors to fake some of the other hooks in the 'updateToken' hook where this data is
        // not otherwise available
        options.pf2e = {
            items: {
                added:
                    data.actorData?.items?.filter((i) => !token.actorData?.items?.map((x) => x._id)?.includes(i._id)) ??
                    [],
                removed:
                    token.actorData?.items?.filter((i) => !data.actorData?.items?.map((x) => x._id)?.includes(i._id)) ??
                    [],
            },
        };
        const actor = canvas.tokens.get(token._id)?.actor;
        if (actor) {
            options.pf2e.items.added.forEach((item: ItemDataPF2e) => {
                preCreateOwnedItem(actor, item, options, userID);
            });
        }
    }
});

Hooks.on('updateToken', (_scene, token: TokenData, data, options, userID) => {
    if (!token.actorLink && options.pf2e?.items) {
        // Synthetic actors do not trigger the 'createOwnedItem' and 'deleteOwnedItem' hooks, so use the previously
        // prepared data from the 'preUpdateToken' hook to trigger the callbacks from here instead
        const actor = canvas.tokens.get(token._id)?.actor;
        if (actor) {
            options.pf2e.items.added.forEach((item: ItemDataPF2e) => {
                createOwnedItem(actor, item, options, userID);
            });
            options.pf2e.items.removed.forEach((item: ItemDataPF2e) => {
                deleteOwnedItem(actor, item, options, userID);
            });
        }
    }

    if ('disposition' in data && game.userId === userID) {
        const actor = canvas.tokens.get(token._id)?.actor;
        if (actor instanceof NPCPF2e) {
            (actor as NPCPF2e).updateNPCAttitudeFromDisposition(data.disposition);
        }
    }

    game.pf2e.effectPanel?.refresh();
});

Hooks.on('controlToken', () => {
    game.pf2e?.effectPanel?.refresh();
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

Hooks.on('updateCombat', () => {
    game.pf2e.effectPanel?.refresh();
});

Hooks.on('renderChatMessage', (message, html) => {
    // remove elements the user does not have permission to see
    if (!game.user.isGM) {
        html.find('[data-visibility="gm"]').remove();
    }

    const actor = message.data.speaker?.actor ? game.actors.get(message.data.speaker.actor) : undefined;
    if (!((actor && actor.owner) || game.user.isGM || message.isAuthor)) {
        html.find('[data-visibility="owner"]').remove();
    }
});
