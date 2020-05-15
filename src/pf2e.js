import { CONFIG as PF2ECONFIG } from './scripts/config.js';
import registerSettings from './module/settings.js';
import loadTemplates from './module/templates.js';
import { initiativeFormula } from './module/combat.js';
import ItemPF2e from './module/item/item.js';
import ActorPF2e from './module/actor/actor.js';
import { PlayerConfigPF2e } from './module/user/playerconfig.js';
import { PF2e } from './module/pf2e-system.js';
import registerActors from './module/register-actors.js';
import PF2eCombatTracker from './module/system/PF2eCombatTracker.js';
import * as migrations from "./module/migration.js";

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
  CONFIG.Item.entityClass = ItemPF2e;
  CONFIG.Actor.entityClass = ActorPF2e;
  //Allowing a decimal on the Combat Tracker so the GM can set the order if players roll the same initiative.
  CONFIG.Combat.initiative.decimals = 1;
  //Assign the PF2e Combat Tracker
  CONFIG.ui.combat = PF2eCombatTracker;
  
  PlayerConfigPF2e.hookOnRenderSettings();  

  registerSettings();
  loadTemplates();
  registerActors();
  Combat.prototype._getInitiativeFormula = initiativeFormula;
});

Hooks.once('ready', () => {
  PlayerConfigPF2e.init();
  PlayerConfigPF2e.activateColorScheme();
});

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once('setup', () => {
  
  window.PF2e = new PF2e;
  
  // Localize CONFIG objects once up-front
  const toLocalize = [
    'abilities', 'skills', 'martialSkills', 'currencies', 'saves',
    'damageTypes', 'weaponDamage', 'healingTypes', 'weaponTypes', 'weaponGroups',
    'weaponDescriptions', 'weaponTraits', 'traitsDescriptions', 'weaponHands', 'backpackTraits',
    'itemBonuses', 'damageDie', 'weaponRange', 'weaponMAP', 'weaponReload', 'armorTypes',
    'armorGroups', 'consumableTypes', 'magicTraditions', 'preparationType', 'spellTraits',
    'featTraits', 'areaTypes', 'areaSizes', 'classTraits', 'ancestryTraits', 'alignment',
    'skillList', 'spellComponents', 'spellTypes', 'spellTraditions', 'spellSchools',
    'spellLevels', 'featTypes', 'featActionTypes', 'actionTypes', 'actionTypes', 'actionsNumber',
    'actionCategories', 'proficiencyLevels', 'heroPointLevels', 'actorSizes', 'bulkTypes',
    'conditionTypes', 'immunityTypes', 'resistanceTypes', 'weaknessTypes', 'languages',
    'monsterTraits', 'spellScalingModes', 'attackEffects',
  ];
  for (const o of toLocalize) {
    CONFIG.PF2E[o] = Object.entries(CONFIG.PF2E[o]).reduce((obj, e) => {
      obj[e[0]] = game.i18n.localize(e[1]);
      return obj;
    }, {});
  }
});

/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {

  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get("pf2e", "worldSchemaVersion");
  const NEEDS_MIGRATION_VERSION = Number(game.system.data.schema);
  const COMPATIBLE_MIGRATION_VERSION = 0.411;
  let needMigration = (currentVersion < NEEDS_MIGRATION_VERSION) || (currentVersion === null);
  const canMigrate = currentVersion >= COMPATIBLE_MIGRATION_VERSION;

  // Perform the migration
  if ( needMigration && game.user.isGM ) {
    if ( currentVersion && (currentVersion < COMPATIBLE_MIGRATION_VERSION) ) {
      ui.notifications.error(`Your PF2E system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`, {permanent: true});
    }
    migrations.migrateWorld();
  }
});

// Activate global listeners
Hooks.on('renderChatLog', (log, html) => ItemPF2e.chatListeners(html));

// Chat hooks - refactor out.
/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on('getChatLogEntryContext', (html, options) => {
  const canApplyDamage = (li) => {
    const { messageId } = li.data();
    const message = game.messages.get(messageId);

    return canvas.tokens.controlledTokens.length && message.isRoll && message.data && message.data.flavor && message.data.flavor.includes('Damage');
  };
  const canApplyHealing = (li) => {
    const { messageId } = li.data();
    const message = game.messages.get(messageId);

    return canvas.tokens.controlledTokens.length && message.isRoll && message.data && message.data.flavor && message.data.flavor.includes('Healing');
  };
  const canApplyInitiative = (li) => {
    const { messageId } = li.data();
    const message = game.messages.get(messageId);

    return canvas.tokens.controlledTokens.length && message.isRoll && message.data && message.data.flavor && message.data.flavor.includes('Skill Check');
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
  );
  return options;
});

Hooks.on('preCreateActor', (actor, dir) => {
  if (game.settings.get('pf2e', 'defaultTokenSettings')) {
    // Set wounds, advantage, and display name visibility
    mergeObject(actor, {
      'token.bar1': { attribute: 'attributes.hp' }, // Default Bar 1 to Wounds
      'token.displayName': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER, // Default display name to be on owner hover
      'token.displayBars': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER, // Default display bars to be on owner hover
      'token.disposition': CONST.TOKEN_DISPOSITIONS.HOSTILE, // Default disposition to hostile
      'token.name': actor.name, // Set token name to actor name
    });

    // Default characters to HasVision = true and Link Data = true
    if (actor.type == 'character') {
      actor.token.vision = true;
      actor.token.disposition = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      actor.token.actorLink = true;
    }
  }
});
