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
