import { createSimpleFormula, parseTermsFromSimpleFormula } from "@system/damage/formula.ts";

/**
 * Combines dice and flat values together in a condensed expression. Also repairs any + - and "- 3" errors.
 * For example, 3d4 + 2d4 + 3d6 + 5 + 2 is combined into 5d4 + 3d6 + 7. - 4 is corrected to -4.
 */
function simplifyFormula(formula: string): string {
    if (formula === "0") return formula;

    const fixedFormula = formula.replace(/^\s*-\s+/, "-").replace(/\s*\+\s*-\s*/g, " - ");
    const roll = new Roll(fixedFormula);
    if (
        !roll.terms.every(
            (t) =>
                [" - ", " + "].includes(t.expression) ||
                t instanceof foundry.dice.terms.Die ||
                t instanceof foundry.dice.terms.NumericTerm,
        )
    ) {
        // This isn't a simple summing of dice: return the roll without further changes
        return fixedFormula;
    }

    const terms = parseTermsFromSimpleFormula(roll);
    return createSimpleFormula(terms);
}

export { simplifyFormula };
