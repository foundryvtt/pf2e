import { nextDamageDieSize } from "@system/damage/helpers.ts";
import { DAMAGE_DICE_FACES } from "@system/damage/values.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import { WeaponPF2e } from "./document.ts";

/** Upgrade a trait with a dice annotation, if possible, or otherwise return the original trait. */
function upgradeWeaponTrait<TTrait extends string>(trait: TTrait): TTrait;
function upgradeWeaponTrait(trait: string): string {
    const match = /-d(4|6|8|10|12)$/.exec(trait);
    const value = Number(match?.at(1));
    if (tupleHasValue(DAMAGE_DICE_FACES, value)) {
        const upgraded = nextDamageDieSize({ upgrade: `d${value}` });
        return trait.replace(new RegExp(String.raw`d${value}$`), upgraded);
    }
    return trait;
}

/**
 * Add a trait to an array of traits--unless it matches an existing trait except by annotation. Replace the trait if
 * the new trait is an upgrade, or otherwise do nothing.
 */
function addOrUpgradeTrait<TTrait extends string>(traits: TTrait[], newTrait: TTrait): TTrait[] {
    const annotatedTraitMatch = newTrait.match(/^([a-z][-a-z]+)-(\d*d?\d+)$/);
    if (!annotatedTraitMatch) return R.unique([...traits, newTrait]);

    const traitBase = annotatedTraitMatch[1];
    const upgradeAnnotation = annotatedTraitMatch[2];
    const traitPattern = new RegExp(String.raw`${traitBase}-(\d*d?\d*)`);
    const existingTrait = traits.find((t) => traitPattern.test(t));
    const existingAnnotation = existingTrait?.match(traitPattern)?.at(1);
    if (!(existingTrait && existingAnnotation)) {
        return R.unique([...traits, newTrait]);
    }

    if (_expectedValueOf(upgradeAnnotation) > _expectedValueOf(existingAnnotation)) {
        traits.splice(traits.indexOf(existingTrait), 1, newTrait);
    }

    return traits;
}

function _expectedValueOf(annotation: string): number {
    const traitValueMatch = annotation.match(/(\d*)d(\d+)/);
    return traitValueMatch
        ? Number(traitValueMatch[1] || 1) * ((Number(traitValueMatch[2]) + 1) / 2)
        : Number(annotation);
}

/** Apply a two-hand trait to a weapon's damage dice. */
function processTwoHandTrait(weapon: WeaponPF2e): void {
    const traits = weapon.system.traits;
    const twoHandFaces = Number(traits.value.find((t) => t.startsWith("two-hand-d"))?.replace("two-hand-d", ""));
    const diceFaces = Number(weapon.system.damage.die?.replace("d", ""));
    if (weapon.handsHeld === 2 && tupleHasValue(DAMAGE_DICE_FACES, twoHandFaces) && twoHandFaces > diceFaces) {
        weapon.system.damage.die = `d${twoHandFaces}`;
    }
}

export { addOrUpgradeTrait, processTwoHandTrait, upgradeWeaponTrait };
