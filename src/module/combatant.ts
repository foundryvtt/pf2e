import type { ActorPF2e } from "@actor/base";
import { TokenPF2e } from "./canvas/token";
import { CombatPF2e } from "./combat";

export class CombatantPF2e extends Combatant {
    /** In order for the Combat Tracker's "Skip Defeated" feature to function, a Combatant instance needs a `defeated`
     *  property or an ActiveEffect with a flag located at `core.statusId`, corresponding with
     *  the value of CONFIG.Combat.defeatedStatusId
     */
    get defeated(): boolean {
        return this.data.defeated;
    }

    /**
     * Hide the tracked resource if the combatant represents a non-player-owned actor
     * @todo Make this a configurable with a metagame-knowledge setting
     */
    override updateResource(): { value: number } | null {
        if (this.isNPC && !game.user.isGM) return (this.resource = null);
        return super.updateResource();
    }

    override _getInitiativeFormula(): string {
        const { actor } = this;
        if (!actor) return "1d20";
        const actorData = actor.data;
        let bonus = 0;

        if (actorData.type === "hazard") {
            bonus = actorData.data.attributes.stealth.value;
        } else if (
            "initiative" in actorData.data.attributes &&
            "totalModifier" in actorData.data.attributes.initiative
        ) {
            bonus = actorData.data.attributes.initiative.totalModifier;
        } else if ("perception" in actorData.data.attributes) {
            bonus = actorData.data.attributes.perception.value;
        }

        const parts = ["1d20", bonus || 0];

        // NPC's are always first in PF2e rules
        if (!actor.hasPlayerOwner) {
            parts.push(0.5);
        }

        return parts.join("+");
    }
}

export interface CombatantPF2e {
    readonly parent: CombatPF2e | null;
    _actor: ActorPF2e | null;
    _token: TokenPF2e | null;
}
