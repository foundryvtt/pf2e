import { ActorPF2e } from "@module/documents.ts";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { CheckRoll } from "@system/check/index.ts";
import { Statistic, StatisticRollParameters } from "@system/statistic/index.ts";
import { AbilityString } from "./types.ts";

interface InitiativeRollResult {
    combatant: CombatantPF2e<EncounterPF2e>;
    roll: Rolled<CheckRoll>;
}

interface InitiativeRollParams extends StatisticRollParameters {
    /** Whether the encounter tracker should be updated with the roll result */
    updateTracker?: boolean;
}

/** A statistic wrapper used to roll initiative for actors */
class ActorInitiative {
    actor: ActorPF2e;
    statistic: Statistic;

    get ability(): AbilityString | null {
        return this.statistic.ability;
    }

    constructor(creature: ActorPF2e, statistic: Statistic) {
        this.actor = creature;
        this.statistic = statistic;
    }

    async roll(args: InitiativeRollParams = {}): Promise<InitiativeRollResult | null> {
        // Get or create the combatant
        const combatant = await CombatantPF2e.fromActor(this.actor, false);
        if (!combatant) return null;

        if (combatant.hidden) {
            args.rollMode = CONST.DICE_ROLL_MODES.PRIVATE;
        }

        const roll = await this.statistic.roll(args);
        if (!roll) {
            // Render combat sidebar in case a combatant was created but the roll was not completed
            game.combats.render(false);
            return null;
        }

        // Update the tracker unless requested not to
        const updateTracker = args.updateTracker ?? true;
        if (updateTracker) {
            combatant.encounter.setInitiative(combatant.id, roll.total);
        }

        return { combatant, roll };
    }
}

export { ActorInitiative, InitiativeRollResult };
