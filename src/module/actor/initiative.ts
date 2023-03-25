import { ActorPF2e } from "@module/documents";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter";
import { CheckRoll } from "@system/check";
import { RollParameters } from "@system/rolls";
import { Statistic } from "@system/statistic";
import { AbilityString } from "./types";

interface InitiativeRollResult {
    combatant: CombatantPF2e<EncounterPF2e>;
    roll: Rolled<CheckRoll>;
}

interface InitiativeRollParams extends RollParameters {
    /** Whether the encounter tracker should be updated with the roll result */
    updateTracker?: boolean;
    skipDialog?: boolean;
    rollMode?: RollMode | "roll";
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

    async roll(args: InitiativeRollParams): Promise<InitiativeRollResult | null> {
        // Get or create the combatant
        const combatant = await (async (): Promise<CombatantPF2e<EncounterPF2e> | null> => {
            if (!game.combat) {
                ui.notifications.error(game.i18n.localize("PF2E.Encounter.NoActiveEncounter"));
                return null;
            }
            const token = this.actor.getActiveTokens().pop();
            const existing = game.combat.combatants.find((combatant) => combatant.actor === this.actor);
            if (existing) {
                return existing;
            } else if (token) {
                await token.toggleCombat(game.combat);
                return token.combatant ?? null;
            } else {
                ui.notifications.error(game.i18n.format("PF2E.Encounter.NoTokenInScene", { actor: this.actor.name }));
                return null;
            }
        })();
        if (!combatant) return null;

        if (combatant.hidden) {
            args.rollMode = CONST.DICE_ROLL_MODES.PRIVATE;
        }

        const roll = await this.statistic.roll(args);
        if (!roll) return null;

        // Update the tracker unless requested not to
        const updateTracker = args.updateTracker ?? true;
        if (updateTracker) {
            game.combat?.setInitiative(combatant.id, roll.total);
        }

        return { combatant, roll };
    }
}

export { ActorInitiative, InitiativeRollResult };
