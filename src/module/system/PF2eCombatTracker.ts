/* global CombatTracker */
export default class extends CombatTracker {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/pf2e/templates/system/combat-tracker.html",
            baseApplication: "CombatTracker",
        });
    }
}