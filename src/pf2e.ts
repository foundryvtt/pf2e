/* global ui, CONST */
import { CONFIG as PF2ECONFIG } from './scripts/config';
import { registerSettings } from './module/settings';
import { loadPF2ETemplates } from './module/templates';
import { initiativeFormula } from './module/combat';
import { registerHandlebarsHelpers } from './module/handlebars';
import { PF2EAction, PF2EAncestry, PF2EArmor, PF2EBackground, PF2EBackpack, PF2EClass, PF2ECondition, PF2EConsumable, PF2EEquipment, PF2EFeat, PF2EItem, PF2EKit, PF2ELore, PF2EMartial, PF2EMelee, PF2ESpell, PF2ESpellcastingEntry, PF2EStatus, PF2ETreasure, PF2EWeapon } from './module/item/item';
import { PF2EActor, PF2EHazard, PF2ELoot, PF2EVehicle } from './module/actor/actor';
import { PF2ECharacter } from './module/actor/character';
import { PF2ENPC } from './module/actor/npc';
import { PF2EFamiliar } from './module/actor/familiar';
import { PlayerConfigPF2e } from './module/user/playerconfig';
import { PF2eSystem } from './module/pf2e-system';
import { registerActors } from './module/register-actors';
import {registerSheets} from './module/register-sheets';
import { PF2eCombatTracker } from './module/system/PF2eCombatTracker';
import { PF2Check } from './module/system/rolls';
import * as migrations from './module/migration';
import { DicePF2e } from './scripts/dice';
import { PF2eStatusEffects } from "./scripts/actor/statusEffects";
import { PF2eConditionManager } from "./module/conditions"
import { FamiliarData } from "./module/actor/actorDataDefinitions";
import {
    AbilityModifier,
    PF2CheckModifier,
    PF2Modifier, PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier
} from "./module/modifiers";
import {WorldClockApplication} from "./module/system/world-clock-application";
import {EffectPanel} from "./module/system/effect-panel";

require('./styles/pf2e.scss');

// load in the scripts (that were previously just included by <script> tags instead of in the bundle
require("./scripts/init.ts");
require("./scripts/actor/statusEffects.ts");
require("./scripts/dice.ts");
require("./scripts/chat/chatdamagebuttonsPF2e.ts");
require("./scripts/chat/crit-fumble-cards.ts");
require("./scripts/actor/sheet/itemBehaviour.ts");
require("./scripts/system/canvasDropHandler");

Hooks.once('init', () => {
  console.log('PF2e | Initializing Pathfinder 2nd Edition System');

  CONFIG.PF2E = PF2ECONFIG;
  // Temporarily overload CONFIG until we're refactored out.
  for (const k in CONFIG.PF2E) {
    if (Object.prototype.hasOwnProperty.call(CONFIG.PF2E, k)) {
      CONFIG[k] = CONFIG.PF2E[k];
    }
  }
  // Assign actor/item classes.
  CONFIG.Item.entityClass = PF2EItem;
  CONFIG.Actor.entityClass = PF2EActor;
  // Automatically advance world time by 6 seconds each round
  CONFIG.time.roundTime = 6;
  // Allowing a decimal on the Combat Tracker so the GM can set the order if players roll the same initiative.
  CONFIG.Combat.initiative.decimals = 1;
  // Assign the PF2e Combat Tracker
  CONFIG.ui.combat = PF2eCombatTracker;

  CONFIG.PF2E.Actor = {
    entityClasses: {
      character: PF2ECharacter,
      npc: PF2ENPC,
      hazard: PF2EHazard,
      loot: PF2ELoot,
      familiar: PF2EFamiliar,
      vehicle: PF2EVehicle,
    }
  };

  CONFIG.PF2E.Item = {
    entityClasses: {
      'backpack': PF2EBackpack,
      'treasure': PF2ETreasure,
      'weapon': PF2EWeapon,
      'armor': PF2EArmor,
      'kit': PF2EKit,
      'melee': PF2EMelee,
      'consumable': PF2EConsumable,
      'equipment': PF2EEquipment,
      'ancestry': PF2EAncestry,
      'background': PF2EBackground,
      'class': PF2EClass,
      'feat': PF2EFeat,
      'lore': PF2ELore,
      'martial': PF2EMartial,
      'action': PF2EAction,
      'spell': PF2ESpell,
      'spellcastingEntry': PF2ESpellcastingEntry,
      'status': PF2EStatus,
      'condition': PF2ECondition,
    }
  };

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
});

/* Update minion-type actors to trigger another prepare data cycle to update their stats of the master actor is updated. */
function _updateMinionActors(master: PF2EActor = undefined) {
  game.actors.entities.filter((actor): actor is PF2EActor & { data: FamiliarData } => ['familiar'].includes(actor.data.type))
    .filter(minion => !!minion.data.data?.master?.id)
    .filter(minion => !master || minion.data.data.master.id === master.data._id)
    .filter(minion => minion.can(game.user, 'owner'))
    .forEach(minion => minion.update({ 'data.master.updated': new Date().toISOString() }));
}

Hooks.once('ready', () => {
  PlayerConfigPF2e.init();
  PlayerConfigPF2e.activateColorScheme();

  // update minion-type actors to trigger another prepare data cycle with the master actor already prepared and ready
  _updateMinionActors();
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
    'abilities', 'skills', 'martialSkills', 'currencies', 'saves', 'armorTraits', 'preciousMaterialGrades',
    'armorPotencyRunes', 'armorResiliencyRunes', 'armorPropertyRunes', 'weaponPotencyRunes', 'weaponStrikingRunes',
    'weaponPropertyRunes', 'rarityTraits',
    'damageTypes', 'weaponDamage', 'healingTypes', 'weaponTypes', 'weaponGroups', 'consumableTraits',
    'weaponDescriptions', 'weaponTraits', 'traitsDescriptions', 'weaponHands', 'equipmentTraits',
    'itemBonuses', 'damageDie', 'weaponRange', 'weaponMAP', 'weaponReload', 'armorTypes',
    'armorGroups', 'consumableTypes', 'magicTraditions', 'preparationType', 'spellTraits',
    'featTraits', 'areaTypes', 'areaSizes', 'classTraits', 'ancestryTraits', 'alignment',
    'skillList', 'spellComponents', 'spellTypes', 'spellTraditions', 'spellSchools',
    'spellLevels', 'featTypes', 'featActionTypes', 'actionTypes', 'actionTypes', 'actionsNumber',
    'actionCategories', 'proficiencyLevels', 'heroPointLevels', 'actorSizes', 'bulkTypes',
    'conditionTypes', 'immunityTypes', 'resistanceTypes', 'weaknessTypes', 'languages',
    'monsterTraits', 'spellScalingModes', 'attackEffects', 'hazardTraits', 'attributes',
    'speedTypes', 'senses', 'preciousMaterials', 'prerequisitePlaceholders', 'ancestryItemTraits',
    'levels',
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
Hooks.once("ready", () => {

  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get("pf2e", "worldSchemaVersion");
  const NEEDS_MIGRATION_VERSION = Number(game.system.data.schema);
  const COMPATIBLE_MIGRATION_VERSION = 0.411;
  const needMigration = (currentVersion < NEEDS_MIGRATION_VERSION) || (currentVersion === null);

  // Perform the migration
  if ( needMigration && game.user.isGM ) {
    if ( currentVersion && (currentVersion < COMPATIBLE_MIGRATION_VERSION) ) {
      ui.notifications.error(`Your PF2E system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`, {permanent: true});
    }
    migrations.migrateWorld();
  }

  // world clock singleton application
  if (game.user.isGM) {
    game[game.system.id].worldclock = new WorldClockApplication();
  }

  // effect panel singleton application
  game[game.system.id].effectPanel = new EffectPanel();
  if (game.user.getFlag(game.system.id, 'showEffectPanel')) {
      game[game.system.id].effectPanel.render(true);
  }
});

// Activate global listeners
Hooks.on('renderChatLog', (log, html) => PF2EItem.chatListeners(html));

// Chat hooks - refactor out.
/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on('getChatLogEntryContext', (html, options) => {
  const canApplyDamage = (li) => {
    const { messageId } = li.data();
    const message = game.messages.get(messageId);

    return canvas.tokens.controlled.length && message.isRoll && message.data && message.data.flavor && message.data.flavor.includes('Damage');
  };
  const canApplyHealing = (li) => {
    const { messageId } = li.data();
    const message = game.messages.get(messageId);

    return canvas.tokens.controlled.length && message.isRoll && message.data && message.data.flavor && message.data.flavor.includes('Healing');
  };
  const canApplyInitiative = (li) => {
    const { messageId } = li.data();
    const message = game.messages.get(messageId);

    // Rolling PC iniative from a regular skill is difficult because of bonuses that can apply to initiative specifically (e.g. Harmlessly Cute)
    // Avoid potential confusion and misunderstanding by just allowing NPCs to roll
    const validActor = (canvas.tokens.controlled?.[0]?.actor?.data?.type === "npc") ?? false;
    const validRollType = (message?.data?.flavor?.includes('Skill Check') || message?.data?.flavor?.includes('Perception Check')) ?? false;
    return validActor && message.isRoll && validRollType;
  };

  const canHeroPointReroll = (li): boolean => {
    const message = game.messages.get(li.data('messageId'));
    const actorId = message.data.speaker.actor;
    const canReroll = message.getFlag('pf2e', 'canReroll');
    if (canReroll && actorId) {
      const actor = game.actors.get(actorId);
      return actor.owner && actor.data.data.attributes.heroPoints?.rank >= 1 && (message.isAuthor || game.user.isGM);
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
      callback: li => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId')), {heroPoint: true})
    },
    {
      name: 'PF2E.RerollMenu.KeepNew',
      icon: '<i class="fas fa-dice"></i>',
      condition: canReroll,
      callback: li => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId')))
    },
    {
      name: 'PF2E.RerollMenu.KeepWorst',
      icon: '<i class="fas fa-dice-one"></i>',
      condition: canReroll,
      callback: li => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId')), {keep: 'worst'})
    },
    {
      name: 'PF2E.RerollMenu.KeepBest',
      icon: '<i class="fas fa-dice-six"></i>',
      condition: canReroll,
      callback: li => PF2Check.rerollFromMessage(game.messages.get(li.data('messageId')), {keep: 'best'})
    },
  );
  return options;
});

Hooks.on('preCreateActor', (actor, dir) => {
  if (game.settings.get('pf2e', 'defaultTokenSettings')) {
    // Set wounds, advantage, and display name visibility
    const nameMode = game.settings.get('pf2e', 'defaultTokenSettingsName');
    const barMode = game.settings.get('pf2e', 'defaultTokenSettingsBar');
    mergeObject(actor, {
      'token.bar1': { attribute: 'attributes.hp' }, // Default Bar 1 to Wounds
      'token.displayName': nameMode, // Default display name to be on owner hover
      'token.displayBars': barMode, // Default display bars to be on owner hover
      'token.disposition': CONST.TOKEN_DISPOSITIONS.HOSTILE, // Default disposition to hostile
      'token.name': actor.name, // Set token name to actor name
    });

    // Default characters to HasVision = true and Link Data = true
    if (actor.type === 'character') {
      actor.token.vision = true;
      actor.token.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      actor.token.actorLink = true;
    }
  }
});

Hooks.on('updateActor', (actor, dir) => {
  // ensure minion-type actors with the updated actor as master should also be updated
  _updateMinionActors(actor);
});

Hooks.on('createOwnedItem', (parent, child, options, userId) => {
    if (parent instanceof PF2EActor) {
        parent.onCreateOwnedItem(child, options, userId);

        game[game.system.id].effectPanel.refresh();
    }
});

Hooks.on('deleteOwnedItem', (parent, child, options, userId) => {
    if (parent instanceof PF2EActor) {
        parent.onDeleteOwnedItem(child, options, userId);

        game[game.system.id].effectPanel.refresh();
    }
});

Hooks.on('updateOwnedItem', (parent, child, options, userId) => {
    if (parent instanceof PF2EActor) {
        game[game.system.id].effectPanel.refresh();
    }
});

// effect panel
Hooks.on('updateUser', (user, diff, options, id) => {
    game[game.system.id].effectPanel.refresh();
});

Hooks.on('controlToken', (token, selected) => {
    game[game.system.id].effectPanel.refresh();
});

// world clock application
Hooks.on('getSceneControlButtons', (controls: any[]) => {
    controls.find(c => c.name === 'token').tools.push({
        name: "effectpanel",
        title: "CONTROLS.EffectPanel",
        icon: "fas fa-star",
        onClick: toggled => {
            if (toggled) {
                game[game.system.id].effectPanel.render(true);
            } else {
                game[game.system.id].effectPanel.close();
            }
            game.user.setFlag(game.system.id, 'showEffectPanel', toggled);
        },
        active: !!game.user.getFlag(game.system.id, 'showEffectPanel'),
        toggle: true
    },{
        name: "worldclock",
        title: "CONTROLS.WorldClock",
        icon: "fas fa-clock",
        visible: game.user.isGM,
        onClick: () => game[game.system.id]?.worldclock?.render(true),
        button: true
    });
});

Hooks.on('updateWorldTime', (total, diff) => {
    const worldclock = game[game.system.id]?.worldclock;
    if (worldclock) {
        worldclock.render(false);
    }
});
