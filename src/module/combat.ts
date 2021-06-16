import { CombatantPF2e } from './combatant';

export class CombatPF2e extends Combat<CombatantPF2e> {
    get active(): boolean {
        return this.data.active;
    }

    /** Exclude orphaned and loot-actor tokens from combat */
    override async createEmbeddedDocuments(
        embeddedName: 'Combatant',
        data: PreCreate<foundry.data.CombatantSource>[],
        context: DocumentModificationContext = {},
    ): Promise<CombatantPF2e[]> {
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

export interface CombatPF2e {
    readonly data: foundry.data.CombatData<this, CombatantPF2e>;
}
