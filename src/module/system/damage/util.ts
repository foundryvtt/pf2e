/* global Roll */
/**
 * Doubles a formula based on the current crit rule
 */
export function doubleFormula(formula: string): string {
    const rule = game.settings.get('pf2e', 'critRule');
    if (rule === 'doubledamage') {
        return `2 * (${formula})`;
    } else {
        const critRoll = new Roll(formula, {}).alter(0, 2);
        return critRoll.formula.replace(/\b\d+\b/g, (match) => `${parseInt(match, 10) * 2}`);
    }
}
