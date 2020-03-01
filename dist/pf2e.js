import { CONFIG as PF2E } from './scripts/config.js';
import registerSettings from './module/settings.js';
import loadTemplates from './module/templates.js';
import { initiativeFormula } from './module/combat.js';
import ItemPF2e from './module/item/item.js';
import ActorPF2e from './module/actor/actor.js';

Hooks.once('init', () => {
  console.log('PF2e | Initializing Pathfinder 2nd Edition');

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


  registerSettings();
  loadTemplates();
  Combat.prototype._getInitiativeFormula = initiativeFormula;
});

// Activate global listeners
Hooks.on('renderChatLog', (log, html) => ItemPF2e.chatListeners(html));

// Chat hooks - refactor out.
/**
 * Hook into chat log context menu to add damage application options
 */
Hooks.on('getChatLogEntryContext', (html, options) => {
  // Condition
  const canApply = (li) => canvas.tokens.controlledTokens.length && li.find('.dice-roll').length;

  options.push(
    {
      name: 'Apply Damage',
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: (li) => ActorPF2e.applyDamage(li, 1),
    },
    {
      name: 'Apply Healing',
      icon: '<i class="fas fa-user-plus"></i>',
      condition: canApply,
      callback: (li) => ActorPF2e.applyDamage(li, -1),
    },
    {
      name: 'Double Damage',
      icon: '<i class="fas fa-user-injured"></i>',
      condition: canApply,
      callback: (li) => ActorPF2e.applyDamage(li, 2),
    },
    {
      name: 'Half Damage',
      icon: '<i class="fas fa-user-shield"></i>',
      condition: canApply,
      callback: (li) => ActorPF2e.applyDamage(li, 0.5),
    },
    {
      name: 'Set as Initiative',
      icon: '<i class="fas fa-fist-raised"></i>',
      condition: canApply,
      callback: (li) => ActorPF2e.setCombatantInitiative(li),
    },
  );
  return options;
});
