import { CONFIG as PF2E } from './scripts/config.js';
import registerSettings from './module/settings.js';
import loadTemplates from './module/templates.js';
import { initiativeFormula } from './module/combat.js';
import ItemPF2e from './module/item/item.js';
import ActorPF2e from './module/actor/actor.js';
import { PlayerConfigPF2e } from './module/user/playerconfig.js';

Hooks.once('init', () => {
  console.log(`PF2e | Initializing Pathfinder 2nd Edition System`);

  CONFIG.PF2E = PF2E;
  // Temporarily overload CONFIG until we're refactored out.
  for (const k in CONFIG.PF2E) {
    if (Object.prototype.hasOwnProperty.call(CONFIG.PF2E, k)) {
      CONFIG[k] = CONFIG.PF2E[k];
    }
  }
  // Assign actor/item classes.
  CONFIG.Item.entityClass = ItemPF2e;
  CONFIG.Actor.entityClass = ActorPF2e;

  PlayerConfigPF2e.init();
  
  registerSettings();
  loadTemplates();
  Combat.prototype._getInitiativeFormula = initiativeFormula;
});

Hooks.once("ready", function() {
  PlayerConfigPF2e.activateColorScheme();
});

/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once("setup", function() {

  // Localize CONFIG objects once up-front
  const toLocalize = [
    "abilities", "skills", "martialSkills", "currencies", "saves"
  ];
  for ( let o of toLocalize ) {
    CONFIG.PF2E[o] = Object.entries(CONFIG.PF2E[o]).reduce((obj, e) => {
      obj[e[0]] = game.i18n.localize(e[1]);
      return obj;
    }, {});
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
