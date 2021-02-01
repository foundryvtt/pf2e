import { ConfigPF2e, PF2ECONFIG } from './scripts/config';
import { rollActionMacro, rollItemMacro } from './scripts/init';
import { registerSettings } from './module/settings/settings';
import { loadPF2ETemplates } from './module/templates';
import { initiativeFormula } from './module/combat';
import { registerHandlebarsHelpers } from './module/handlebars';
import { PF2EItem } from './module/item/item';
import { PF2EActor } from './module/actor/actor';
import { PF2ENPC } from './module/actor/npc';
import { PlayerConfigPF2e } from './module/user/playerconfig';
import { PF2eSystem } from './module/pf2e-system';
import { registerActors } from './module/register-actors';
import { registerSheets } from './module/register-sheets';
import { PF2eCombatTracker } from './module/system/PF2eCombatTracker';
import { PF2Check } from './module/system/rolls';
import { DicePF2e } from './scripts/dice';
import { PF2eStatusEffects } from './scripts/actor/statusEffects';
import { PF2eConditionManager } from './module/conditions';
import { ActorDataPF2e, FamiliarData } from './module/actor/actorDataDefinitions';
import {
    AbilityModifier,
    PF2CheckModifier,
    PF2Modifier,
    PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier,
} from './module/modifiers';
import { WorldClockApplication } from './module/system/world-clock-application';
import { EffectPanel } from './module/system/effect-panel';
import { activateSocketListener, SocketEventCallback } from './scripts/socket';
import { earnIncome } from './module/earn-income';
import { calculateXP } from './module/xp';
import { launchTravelSheet } from './module/gm/travel/travel-speed-sheet';
import { MigrationRunner } from './module/migration-runner';
import { Migrations } from './module/migrations';
import { ItemData } from './module/item/dataDefinitions';
import { CompendiumDirectoryPF2e } from './module/apps/ui/compendium-directory';
import { PF2Actions } from './module/system/actions/actions';
import DOMPurify from 'dompurify';
import { PF2ActionElement } from './module/custom-elements/pf2-action';

require('./styles/pf2e.scss');

// load in the scripts (that were previously just included by <script> tags instead of in the bundle
require('./scripts/init.ts');
require('./scripts/actor/statusEffects.ts');
require('./scripts/dice.ts');
require('./scripts/chat/chatdamagebuttonsPF2e.ts');
require('./scripts/chat/crit-fumble-cards.ts');
require('./scripts/actor/sheet/itemBehaviour.ts');
require('./scripts/system/canvasDropHandler');
require('./module/custom-elements/custom-elements');

interface GamePF2e extends Game<PF2EActor, PF2EItem> {
    pf2e: {
        actions: { [key: string]: Function };
        worldclock?: WorldClockApplication;
        effectPanel?: EffectPanel;
        rollItemMacro?: typeof rollItemMacro;
        rollActionMacro: typeof rollActionMacro;
    };
    socket: SocketIO.Socket & {
        emit(message: Pick<SocketEventCallback, 0>): void;
        on(event: string, ...message: SocketEventCallback): void;
    };
}

declare global {
    const game: GamePF2e;
    const CONFIG: ConfigPF2e;
    const canvas: Canvas<PF2EActor>;
    let PF2e: PF2eSystem;
}

Hooks.once('init', () => {
    console.log('PF2e | Initializing Pathfinder 2nd Edition System');

    CONFIG.PF2E = PF2ECONFIG;

    // Assign actor/item classes.
    CONFIG.Item.entityClass = PF2EItem;
    CONFIG.Actor.entityClass = PF2EActor;
    // Automatically advance world time by 6 seconds each round
    CONFIG.time.roundTime = 6;
    // Allowing a decimal on the Combat Tracker so the GM can set the order if players roll the same initiative.
    CONFIG.Combat.initiative.decimals = 1;
    // Assign the PF2e Combat Tracker
    CONFIG.ui.combat = PF2eCombatTracker;
    // Assign the PF2e CompendiumDirectory
    CONFIG.ui.compendium = CompendiumDirectoryPF2e;

    // configure the bundled TinyMCE editor with PF2-specific options
    CONFIG.TinyMCE.content_css = (CONFIG.TinyMCE.content_css ?? []).concat(`systems/${game.system.id}/styles/pf2e.css`);
    CONFIG.TinyMCE.style_formats = (CONFIG.TinyMCE.style_formats ?? []).concat({
        title: 'Icons A D T F R',
        inline: 'span',
        classes: ['pf2-icon'],
        wrapper: true,
    });

    // configure the bundled TinyMCE editor with PF2-specific options
    CONFIG.TinyMCE.extended_valid_elements = 'pf2-action[action|glyph]';
    CONFIG.TinyMCE.content_css = (CONFIG.TinyMCE.content_css ?? []).concat(`systems/${game.system.id}/styles/pf2e.css`);
    CONFIG.TinyMCE.style_formats = (CONFIG.TinyMCE.style_formats ?? []).concat({
        title: 'Icons A D T F R',
        inline: 'span',
        classes: ['pf2-icon'],
        wrapper: true,
    });

    PlayerConfigPF2e.hookOnRenderSettings();

    registerSettings();
    loadPF2ETemplates();
    registerActors();
    registerSheets();
    registerHandlebarsHelpers();
    // @ts-ignore
    Combat.prototype._getInitiativeFormula = initiativeFormula;

    // expose a few things to the global world, so that other modules can use our stuff
    // instead of being locked in our world after we started building with webpack
    // which enforced modules being private
    (window as any).DicePF2e = DicePF2e;
    (window as any).PF2eStatusEffects = PF2eStatusEffects;
    (window as any).PF2eConditionManager = PF2eConditionManager;
    (window as any).PF2ModifierType = PF2ModifierType;
    (window as any).PF2Modifier = PF2Modifier;
    (window as any).AbilityModifier = AbilityModifier;
    (window as any).ProficiencyModifier = ProficiencyModifier;
    (window as any).PF2StatisticModifier = PF2StatisticModifier;
    (window as any).PF2CheckModifier = PF2CheckModifier;
    (window as any).PF2Check = PF2Check;

    // expose actions until we know how to include them on the sheet
    game.pf2e.actions = {
        earnIncome,
    };
    PF2Actions.exposeActions(game.pf2e.actions);

    (game.pf2e as any).gm = {
        calculateXP,
        launchTravelSheet,
    };
});

/* Update minion-type actors to trigger another prepare data cycle to update their stats of the master actor is updated. */
function _updateMinionActors(master: PF2EActor = undefined) {
    game.actors.entities
        .filter((actor): actor is PF2EActor & { data: FamiliarData } => ['familiar'].includes(actor.data.type))
        .filter((minion) => !!minion.data.data?.master?.id)
        .filter((minion) => !master || minion.data.data.master.id === master.data._id)
        .filter((minion) => minion.can(game.user, 'update'))
        .forEach((minion) => minion.update({ 'data.master.updated': new Date().toISOString() }));
}

Hooks.once('ready', () => {
    PlayerConfigPF2e.init();
    PlayerConfigPF2e.activateColorScheme();

    // update minion-type actors to trigger another prepare data cycle with the master actor already prepared and ready
    _updateMinionActors();
    activateSocketListener();
});

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once('setup', () => {
    (window as any).PF2e = new PF2eSystem();

    // Localize CONFIG objects once up-front
    const toLocalize = [
        'abilities',
        'skills',
        'martialSkills',
        'currencies',
        'saves',
        'armorTraits',
        'preciousMaterialGrades',
        'armorPotencyRunes',
        'armorResiliencyRunes',
        'armorPropertyRunes',
        'weaponPotencyRunes',
        'weaponStrikingRunes',
        'weaponPropertyRunes',
        'rarityTraits',
        'damageTypes',
        'weaponDamage',
        'healingTypes',
        'weaponTypes',
        'weaponGroups',
        'consumableTraits',
        'weaponDescriptions',
        'weaponTraits',
        'traitsDescriptions',
        'weaponHands',
        'equipmentTraits',
        'itemBonuses',
        'damageDie',
        'weaponRange',
        'weaponMAP',
        'weaponReload',
        'armorTypes',
        'armorGroups',
        'consumableTypes',
        'magicTraditions',
        'preparationType',
        'spellTraits',
        'featTraits',
        'areaTypes',
        'areaSizes',
        'classTraits',
        'ancestryTraits',
        'alignment',
        'skillList',
        'spellComponents',
        'spellTypes',
        'spellTraditions',
        'spellSchools',
        'spellLevels',
        'featTypes',
        'featActionTypes',
        'actionTypes',
        'actionTypes',
        'actionsNumber',
        'actionCategories',
        'proficiencyLevels',
        'heroPointLevels',
        'actorSizes',
        'bulkTypes',
        'conditionTypes',
        'immunityTypes',
        'resistanceTypes',
        'weaknessTypes',
        'languages',
        'monsterTraits',
        'spellScalingModes',
        'attackEffects',
        'hazardTraits',
        'attributes',
        'speedTypes',
        'senses',
        'preciousMaterials',
        'prerequisitePlaceholders',
        'ancestryItemTraits',
        'levels',
        'dcAdjustments',
    ];
    for (const o of toLocalize) {
        CONFIG.PF2E[o] = Object.entries(CONFIG.PF2E[o]).reduce((obj, e: any) => {
            obj[e[0]] = game.i18n.localize(e[1]);
            return obj;
        }, {});
    }
});

/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once('ready', () => {
    // Determine whether a system migration is required and feasible
    const currentVersion = game.settings.get('pf2e', 'worldSchemaVersion');
    const COMPATIBLE_MIGRATION_VERSION = 0.411;

    if (game.user.isGM) {
        // Perform the migration
        const migrationRunner = new MigrationRunner(Migrations.constructAll());
        if (migrationRunner.needsMigration()) {
            if (currentVersion && currentVersion < COMPATIBLE_MIGRATION_VERSION) {
                ui.notifications.error(
                    `Your PF2E system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
                    { permanent: true },
                );
            }
            migrationRunner.runMigration();
        }
    }

    // world clock singleton application
    if (game.user.isGM) {
        game.pf2e.worldclock = new WorldClockApplication();
    }

    // effect panel singleton application
    game[game.system.id].effectPanel = new EffectPanel();
    if (game.user.getFlag(game.system.id, 'showEffectPanel') ?? true) {
        game.pf2e.effectPanel.render(true);
    }
});

// Activate global listeners
Hooks.on('renderChatLog', (log, html) => PF2EItem.chatListeners(html));
Hooks.on('renderChatPopout', (log, html) => PF2EItem.chatListeners(html));

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
            callback: (li) => PF2EActor.applyDamage(li, 1),
        },
        {
            name: 'Apply Healing',
            icon: '<i class="fas fa-user-plus"></i>',
            condition: canApplyHealing,
            callback: (li) => PF2EActor.applyDamage(li, -1),
        },
        {
            name: 'Double Damage',
            icon: '<i class="fas fa-user-injured"></i>',
            condition: canApplyDamage,
            callback: (li) => PF2EActor.applyDamage(li, 2),
        },
        {
            name: 'Half Damage',
            icon: '<i class="fas fa-user-shield"></i>',
            condition: canApplyDamage,
            callback: (li) => PF2EActor.applyDamage(li, 0.5),
        },
        {
            name: 'Set as Initiative',
            icon: '<i class="fas fa-fist-raised"></i>',
            condition: canApplyInitiative,
            callback: (li) => PF2EActor.setCombatantInitiative(li),
        },
        {
            name: 'PF2E.RerollMenu.HeroPoint',
            icon: '<i class="fas fa-hospital-symbol"></i>',
            condition: canHeroPointReroll,
            callback: (li) => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId')), { heroPoint: true }),
        },
        {
            name: 'PF2E.RerollMenu.KeepNew',
            icon: '<i class="fas fa-dice"></i>',
            condition: canReroll,
            callback: (li) => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId'))),
        },
        {
            name: 'PF2E.RerollMenu.KeepWorst',
            icon: '<i class="fas fa-dice-one"></i>',
            condition: canReroll,
            callback: (li) => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId')), { keep: 'worst' }),
        },
        {
            name: 'PF2E.RerollMenu.KeepBest',
            icon: '<i class="fas fa-dice-six"></i>',
            condition: canReroll,
            callback: (li) => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId')), { keep: 'best' }),
        },
    );
    return options;
});

Hooks.on('preCreateActor', (actorData: Partial<ActorDataPF2e>, _dir: ActorDirectory) => {
    actorData.img = (() => {
        if (actorData.img !== undefined) {
            return actorData.img;
        }
        return CONFIG.PF2E.Actor.entityClasses[actorData.type].defaultImg;
    })();

    if (game.settings.get('pf2e', 'defaultTokenSettings')) {
        // Set wounds, advantage, and display name visibility
        const nameMode = game.settings.get('pf2e', 'defaultTokenSettingsName');
        const barMode = game.settings.get('pf2e', 'defaultTokenSettingsBar');
        mergeObject(actorData, {
            'token.bar1': { attribute: 'attributes.hp' }, // Default Bar 1 to Wounds
            'token.displayName': nameMode, // Default display name to be on owner hover
            'token.displayBars': barMode, // Default display bars to be on owner hover
            'token.disposition': CONST.TOKEN_DISPOSITIONS.HOSTILE, // Default disposition to hostile
            'token.name': actorData.name, // Set token name to actor name
        });

        // Default characters to HasVision = true and Link Data = true
        if (actorData.type === 'character') {
            actorData.token.vision = true;
            actorData.token.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
            actorData.token.actorLink = true;
        }
    }
});

Hooks.on('preCreateItem', (itemData: Partial<ItemData>) => {
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
        _updateMinionActors(actor);
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
    if (parent instanceof PF2EActor) {
        if (userID === game.userId) {
            parent.onCreateOwnedItem(child, options, userID);
        }

        game[game.system.id].effectPanel?.refresh();
    }
}

Hooks.on('createOwnedItem', createOwnedItem);

function deleteOwnedItem(parent, child, options, userID) {
    if (parent instanceof PF2EActor) {
        if (userID === game.userId) {
            parent.onDeleteOwnedItem(child, options, userID);
        }

        game[game.system.id].effectPanel?.refresh();
    }
}

Hooks.on('deleteOwnedItem', deleteOwnedItem);

Hooks.on('updateOwnedItem', (parent, child, options, userId) => {
    if (parent instanceof PF2EActor) {
        game[game.system.id].effectPanel?.refresh();
    }
});

// effect panel
Hooks.on('updateUser', (user, diff, options, id) => {
    game[game.system.id].effectPanel?.refresh();
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
            if (actor instanceof PF2ENPC) {
                (actor as PF2ENPC).updateNPCAttitudeFromDisposition(data.disposition);
            }
        }
    }

    game[game.system.id].effectPanel?.refresh();
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
                onClick: (toggled) => {
                    if (toggled) {
                        game[game.system.id].effectPanel?.render(true);
                    } else {
                        game[game.system.id].effectPanel?.close();
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
                visible: game.user.isGM,
                onClick: () => game[game.system.id]?.worldclock?.render(true),
                button: true,
            },
        );
});

Hooks.on('updateWorldTime', (total, diff) => {
    const worldclock = game.pf2e.worldclock;
    if (worldclock) {
        worldclock.render(false);
    }
    game.pf2e.effectPanel.refresh();
});

Hooks.on('updateCombat', (combat, diff, options, userID) => {
    game.pf2e.effectPanel.refresh();
});

Hooks.on('renderChatMessage', (message: ChatMessage, html: JQuery) => {
    if (message.data.flags[game.system.id]?.unsafe) {
        const unsafe = message.data.flags[game.system.id].unsafe;

        // strip out script tags to prevent cross-site scripting
        const safe = DOMPurify.sanitize(unsafe, {
            ADD_TAGS: [PF2ActionElement.tagName],
            ADD_ATTR: [...PF2ActionElement.observedAttributes],
        });

        html.find('.flavor-text').html(safe);
    }
});
