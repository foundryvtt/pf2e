import { DamageDicePF2e } from "@actor/modifiers";

/** Apply damage dice to a spell's damage formulas: currently only support simple overrides */
function applyDamageDice(formulas: string[], dice: DamageDicePF2e[]): string[] {
    return formulas.map((formula): string => {
        const roll = new Roll(formula);
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

        return roll.formula;
    });
}

export { applyDamageDice };
