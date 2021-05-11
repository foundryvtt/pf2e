import { ActorPF2e } from '@actor/base';
import { ActorDataPF2e } from '@actor/data-definitions';

type CombatantDataPF2e = CombatantData<ActorPF2e>;

export class CombatPF2e extends Combat<ActorPF2e> {
    /** Exclude orphaned and loot-actor tokens from combat */
    async createEmbeddedDocuments(
        embeddedName: 'Combatant',
        data: CombatantDataPF2e[],
        options?: EntityCreateOptions,
    ): Promise<CombatantDataPF2e[]>;
    async createEmbeddedDocuments(
        embeddedName: 'Combatant',
        data: CombatantDataPF2e[],
        options?: EntityCreateOptions,
    ): Promise<CombatantDataPF2e[]>;
    async createEmbeddedDocuments(
        embeddedName: 'Combatant',
        data: CombatantDataPF2e[],
        options?: EntityCreateOptions,
    ): Promise<CombatantDataPF2e[]> {
        const createData = (Array.isArray(data) ? data : [data]).filter((datum) => {
            const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.id === datum.tokenId);
            if (token === undefined) {
                return false;
            }
            if (token.actor === null) {
                ui.notifications.warn(`${token.name} has no associated actor.`);
                return false;
            }
            if (token.actor.type === 'loot') {
                ui.notifications.info(`Excluding loot token ${token.name}.`);
                return false;
            }
            return true;
        });
        return super.createEmbeddedDocuments(embeddedName, createData, options);
    }

    /** Use a Pathfinder 2e roll formula */
    _getInitiativeFormula(combatant: CombatantDataPF2e): string {
        const { actor } = combatant;
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

        // Only show initiative bonuses if they are there. Else it always shows "+ 0" on the roll.
        if (
            ((data.attributes.initiative || {}).circumstance || 0) +
                ((data.attributes.initiative || {}).status || 0) !==
            0
        ) {
            parts.push((data.attributes.initiative?.circumstance || 0) + (data.attributes.initiative?.status || 0));
        }

        // NPC's are always first in PF2e rules
        if (!actor.hasPlayerOwner) {
            parts.push(0.5);
        }

        return parts.join('+');
    }
}
