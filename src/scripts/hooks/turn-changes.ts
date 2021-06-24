import { CombatPF2e } from '@module/combat';

export function listen(): void {
    // attempt to detect turn changes using a combination of preUpdateCombat, updateCombat, and deleteCombat hooks

    Hooks.on('preUpdateCombat', (combat: CombatPF2e, diff: any, options: any, _userID: string) => {
        if (combat.started && ('round' in diff || 'turn' in diff) && combat.current?.combatantId) {
            options.pf2e ??= {};
            options.pf2e.endTurn = combat.current.combatantId;
        }
    });

    Hooks.on('updateCombat', async (combat: CombatPF2e, diff: any, options: any, userID: string) => {
        await game.pf2e.effectTracker.refresh();
        game.pf2e.effectPanel.refresh();

        if (combat.started && ('round' in diff || 'turn' in diff) && combat.current?.combatantId) {
            options.pf2e ??= {};
            options.pf2e.startTurn = combat.current.combatantId;
        }
        if (combat.started && options.pf2e?.endTurn) {
            const combatant = combat.data.combatants.get(options.pf2e.endTurn);
            if (combatant) {
                console.debug('PF2e System | End turn', combatant.name);
                Hooks.call('pf2e.endTurn', combatant, combat, userID);
            } else {
                console.warn('PF2e System | End turn for unknown combatant');
            }
        }
        if (combat.started && options.pf2e?.startTurn) {
            const combatant = combat.data.combatants.get(options.pf2e.startTurn);
            if (combatant) {
                console.debug('PF2e System | Start turn', combatant.name);
                Hooks.call('pf2e.startTurn', combatant, combat, userID);
            } else {
                console.warn('PF2e System | Start turn for unknown combatant');
            }
        }
    });

    Hooks.on('deleteCombat', async (combat: CombatPF2e, _options: any, userID: string) => {
        await game.pf2e.effectTracker.refresh();
        game.pf2e.effectPanel.refresh();

        if (combat.started && combat.current?.combatantId) {
            const combatant = combat.data.combatants.get(combat.current.combatantId);
            if (combatant) {
                console.debug('PF2e System | End turn', combatant.name);
                Hooks.call('pf2e.endTurn', combatant, combat, userID);
            } else {
                console.warn('PF2e System | End turn for unknown combatant');
            }
        }
    });
}
