import { ActorDataPF2e } from '@actor/data-definitions';

export class CombatantPF2e extends Combatant {
    /**
     * Hide the tracked resource if the combatant represents a non-player-owned actor
     * @todo Make this a configurable with a metagame-knowledge setting
     * @override
     */
    updateResource(): { value: number } | null {
        if (this.isNPC && !game.user.isGM) return (this.resource = null);
        return super.updateResource();
    }

    /** @override */
    _getInitiativeFormula(): string {
        const { actor } = this;
        if (!actor) return '1d20';
        const actorType = actor.data.type;
        const data: Partial<ActorDataPF2e['data']> = actor ? actor.data.data : {};
        let bonus: number;
        const modifierEnabledInit = data.attributes?.initiative?.totalModifier;
        if (actorType === 'hazard') {
            bonus = data.attributes.stealth.value;
        } else if (modifierEnabledInit !== undefined) {
            bonus = modifierEnabledInit;
        } else {
            bonus = data.attributes.perception.value;
        }

        const parts = ['1d20', bonus || 0];

        // NPC's are always first in PF2e rules
        if (!actor.hasPlayerOwner) {
            parts.push(0.5);
        }

        return parts.join('+');
    }
}
