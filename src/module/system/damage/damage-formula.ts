import { DamageEntry } from './damage-entry';
import { groupBy } from '../../utils';

export class DamageFormula {
    entries: DamageEntry[];

    constructor(entries: DamageEntry[]) {
        this.entries = entries;
    }

    toString(): string {
        const entriesByMultiplier = groupBy(this.entries, (entry) => entry.multiplier);

        const terms = [...entriesByMultiplier].map(([multiplier, entries]) => {
            const partTerms = this.prepareTerms(entries);
            return this.applyMultiplier(multiplier, partTerms.join(' + '));
        });

        return terms.join(' + ');
    }

    private prepareTerms(entries): string[] {
        const terms: string[] = [];

        let modifier = 0;
        const dice: Record<string, number> = {};

        entries.forEach((entry) => {
            modifier += entry.modifier;

            if (entry.dieSize) {
                dice[entry.dieSize] ??= 0;
                dice[entry.dieSize] += entry.diceNumber;
            } else {
                modifier += entry.diceNumber;
            }
        });

        for (const [dieSize, diceNumber] of Object.entries(dice)) {
            terms.push(`${diceNumber}${dieSize}`);
        }
        if (modifier) terms.push(modifier.toString());

        return terms;
    }

    private applyMultiplier(multiplier: number, formula: string): string {
        if (multiplier == 0) return '';
        else if (multiplier == 1) return formula;
        else if (multiplier == 2) return this.doubleFormula(formula);
        else return `${multiplier} * (${formula})`;
    }

    /** Double a textual formula based on the current crit rules. */
    private doubleFormula(formula: string): string {
        const rule = game.settings.get('pf2e', 'critRule');
        if (rule === 'doubledamage') {
            return `2 * (${formula})`;
        } else {
            const critRoll = new Roll(formula, {}).alter(2, 0, { multiplyNumeric: true });
            return critRoll.formula;
        }
    }
}
