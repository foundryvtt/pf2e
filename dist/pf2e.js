import PF2E from './scripts/config';
import registerSettings from './module/settings';
import loadTemplates from './module/templates';
import { initiativeFormula } from './module/combat';

Hooks.once('init', () => {
  CONFIG.PF2E = PF2E;
  registerSettings();
  loadTemplates();
  Combat.prototype._getInitiativeFormula = initiativeFormula;
});
