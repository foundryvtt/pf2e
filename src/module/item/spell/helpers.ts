import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers";
import { combineTerms } from "@scripts/dice";
import { DamageType } from "@system/damage";

/** Contains the formula and all modifiers that apply to the instance */
interface DamageInstancePartial {
    formula: string;
    damageType: DamageType;
    damageCategory: string | null;

    /** Additional damage tags such as silver or orichalcum */
    tags: Set<string>;

    /** Tracks which modifiers added to this instance */
    modifiers: ModifierPF2e[];
}

/** Apply damage dice to a spell's damage formulas: currently only support simple overrides */
function applyDamageDice(formulas: DamageInstancePartial[], dice: DamageDicePF2e[]): void {
    for (const data of formulas) {
        const roll = new Roll(data.formula);
        for (const adjustment of dice) {
            const die = roll.dice.shift();
            if (!(die instanceof Die)) continue;

            if (adjustment.override) {
                die.number = adjustment.override.diceNumber ?? die.number;
                if (adjustment.override.dieSize) {
                    const faces = Number(/\d{1,2}/.exec(adjustment.override.dieSize)?.shift());
                    if (Number.isInteger(faces)) die.faces = faces;
                }
            }
        }

        data.formula = roll.formula;
    }
}

interface FormulaAndTags {
    formula: string;
    breakdownTags: string[];
}

/** Creates the formula and the breakdown tags for the instance partial data */
function createFormulaAndTagsForPartial(data: DamageInstancePartial, typeLabel?: string | null): FormulaAndTags {
    const formulaPartials = data.modifiers.map((m) => String(m.modifier));
    const breakdownTags = data.modifiers.map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`);

    if (data.formula !== "0" || !data.modifiers.length) {
        formulaPartials.unshift(data.formula);
        breakdownTags.unshift(data.formula);
    }

    // first breakdown gets the type label
    if (typeLabel) {
        breakdownTags[0] = breakdownTags[0] + ` ${typeLabel}`;
    }

    const formula = combineTerms(formulaPartials.join(" + "));
    return { formula, breakdownTags };
}

export { DamageInstancePartial as DamageInstanceData, applyDamageDice, createFormulaAndTagsForPartial };
