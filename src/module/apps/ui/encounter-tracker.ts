import { CombatPF2e } from "@module/combat";

export class EncounterTrackerPF2e extends CombatTracker<CombatPF2e> {
    /** Fix Foundry setting the title to "Combat Tracker" unlocalized */
    static override get defaultOptions(): CombatTrackerOptions {
        const options = super.defaultOptions;
        options.title = "SIDEBAR.TabCombat";
        return options;
    }
}
