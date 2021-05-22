import { ActorDataPF2e } from '@actor/data-definitions';

export class CombatPF2e extends Combat {
    get active(): boolean {
        return this.data.active;
    }

    /** Exclude orphaned and loot-actor tokens from combat */
    async createEmbeddedDocuments(
        embeddedName: 'Combatant',
        data: Partial<foundry.data.CombatantSource>[],
        context?: DocumentModificationContext,
    ): Promise<Combatant[]> {
        const createData = data.filter((datum) => {
            const token = canvas.tokens.placeables.find((canvasToken) => canvasToken.id === datum.tokenId);
            if (!token) return false;
            if (!token.actor) {
                ui.notifications.warn(`${token.name} has no associated actor.`);
                return false;
            }
            if (token.actor.type === 'loot') {
                ui.notifications.info(`Excluding loot token ${token.name}.`);
                return false;
            }
            return true;
        });
        return super.createEmbeddedDocuments(embeddedName, createData, context);
    }
}

/** Use a Pathfinder 2e roll formula */
export function initiativeFormula(combatant: Combatant): string {
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
        ((data.attributes.initiative || {}).circumstance || 0) + ((data.attributes.initiative || {}).status || 0) !==
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
