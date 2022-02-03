import { DamageTerm } from "./damage-term";
import { groupBy } from "@util";

export class DamageFormula {
    terms: DamageTerm[];

    constructor(entries: DamageTerm[]) {
        this.terms = entries;
    }

    toString(): string {
        const termsByMultiplier = groupBy(this.terms, (term) => term.multiplier);

        const terms = [...termsByMultiplier].map(([multiplier, partialTerms]) => {
            const diceTerms = this.prepareTerms(partialTerms);
            return this.applyMultiplier(multiplier, diceTerms.join(" + "));
        });

        return terms.join(" + ").replace(/\s*\+\s*-\s*/g, " - ");
    }

    private prepareTerms(terms: DamageTerm[]): string[] {
        const result: string[] = [];

        let modifier = 0;
        const dice: Record<string, number> = {};

        terms.forEach((term) => {
            modifier += term.modifier;

            if (term.dieSize) {
                dice[term.dieSize] ??= 0;
                dice[term.dieSize] += term.diceNumber;
            } else {
                modifier += term.diceNumber;
            }
        });

        for (const [dieSize, diceNumber] of Object.entries(dice)) {
            result.push(`${diceNumber}${dieSize}`);
        }
        if (modifier) result.push(modifier.toString());

        return result;
    }

    private applyMultiplier(multiplier: number, formula: string): string {
        if (multiplier === 0) return "";
        else if (multiplier === 1) return formula;
        else if (multiplier === 2) return this.doubleFormula(formula);
        else return `${multiplier} * (${formula})`;
    }

    /** Double a textual formula based on the current crit rules. */
    private doubleFormula(formula: string): string {
        const rule = game.settings.get("pf2e", "critRule");
        if (rule === "doubledamage") {
            return `2 * (${formula})`;
        } else {
            const critRoll = new Roll(formula, {}).alter(2, 0, { multiplyNumeric: true });
            return critRoll.formula;
        }
    }
}
