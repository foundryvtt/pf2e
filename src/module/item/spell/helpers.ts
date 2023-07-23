import { DamageDicePF2e } from "@actor/modifiers.ts";
import { DamagePartialTerm, BaseDamageData } from "@system/damage/index.ts";

type RequiredNonNullable<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

/** Apply damage dice to a spell's damage formulas (for now, terms only) */
function applyDamageDiceOverrides(base: BaseDamageData[], dice: DamageDicePF2e[]): void {
    const overrideDice = dice.filter(
        (d): d is RequiredNonNullable<DamageDicePF2e, "override"> => !d.ignored && !!d.override
    );

    if (!overrideDice.length) return;

    for (const data of base) {
        for (const adjustment of overrideDice) {
            const die = data.terms?.find((t): t is RequiredNonNullable<DamagePartialTerm, "dice"> => !!t.dice);
            if (!die) continue;

            die.dice.number = adjustment.override.diceNumber ?? die.dice.number;
            if (adjustment.override.dieSize) {
                const faces = Number(/\d{1,2}/.exec(adjustment.override.dieSize)?.shift());
                if (Number.isInteger(faces)) die.dice.faces = faces;
            }
        }
    }
}

export { applyDamageDiceOverrides };
