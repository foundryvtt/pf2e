import { CombatPF2e } from '@module/combat';

export function listen(): void {
    // attempt to detect turn changes using a combination of preUpdateCombat, updateCombat, and deleteCombat hooks

    Hooks.on('preUpdateCombat', (combat: CombatPF2e, diff: any, options: any, _userID: string) => {
        if (combat.started && ('round' in diff || 'turn' in diff) && combat.current?.tokenId) {
            options.pf2e ??= {};
            options.pf2e.endTurn = combat.current.tokenId;
        }
    });

    Hooks.on('updateCombat', async (combat: CombatPF2e, diff: any, options: any, _userID: string) => {
        await game.pf2e.effectTracker.refresh();
        game.pf2e.effectPanel.refresh();

        if (combat.started && ('round' in diff || 'turn' in diff) && combat.current?.tokenId) {
            options.pf2e ??= {};
            options.pf2e.startTurn = combat.current.tokenId;
        }
        if (options.pf2e?.endTurn && options.pf2e.endTurn !== options.pf2e.startTurn) {
            const end = canvas.tokens.placeables.find((p) => p.id === options.pf2e.endTurn);
            if (end) {
                console.debug('PF2e System | End turn', end.data.name);
            } else {
                console.warn('PF2e System | End turn for unknown combatant');
            }
        }
        if (options.pf2e?.startTurn) {
            const start = canvas.tokens.placeables.find((p) => p.id === options.pf2e.startTurn);
            if (start) {
                console.debug('PF2e System | Start turn', start.data.name);
            } else {
                console.warn('PF2e System | Start turn for unknown combatant');
            }
        }
    });

    Hooks.on('deleteCombat', async (combat: CombatPF2e, _options: any, _userID: string) => {
        await game.pf2e.effectTracker.refresh();
        game.pf2e.effectPanel.refresh();

        if (combat.started && combat.current?.tokenId) {
            const end = canvas.tokens.placeables.find((p) => p.id === combat.current.tokenId);
            if (end) {
                console.debug('PF2e System | End turn', end.data.name);
            } else {
                console.warn('PF2e System | End turn for unknown combatant');
            }
        }
    });
}
