/* global CombatTracker */
export class PF2eCombatTracker extends CombatTracker {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: 'systems/pf2e/templates/system/combat-tracker.html',
            baseApplication: 'CombatTracker',
        });
    }
}
