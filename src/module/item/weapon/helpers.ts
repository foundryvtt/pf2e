import { ActorPF2e } from "@actor";
import { ConsumablePF2e } from "@item/consumable/document.ts";
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

/** Apply a two-hand trait to a weapon's damage dice. */
function processTwoHandTrait(weapon: WeaponPF2e): void {
    const traits = weapon.system.traits;
    const twoHandFaces = Number(traits.value.find((t) => t.startsWith("two-hand-d"))?.replace("two-hand-d", ""));
    const diceFaces = Number(weapon.system.damage.die?.replace("d", ""));
    if (weapon.handsHeld === 2 && tupleHasValue(DAMAGE_DICE_FACES, twoHandFaces) && twoHandFaces > diceFaces) {
        weapon.system.damage.die = `d${twoHandFaces}`;
    }
}

/** Returns all ammo currently loaded in this weapon */
function getLoadedAmmo<T extends WeaponPF2e<A>, A extends ActorPF2e | null>(
    weapon: T,
): (WeaponPF2e<A> | ConsumablePF2e<A>)[] {
    if (!weapon.system.ammo?.capacity) return [];
    const ammo = weapon.subitems.filter(
        (i): i is WeaponPF2e<A> | ConsumablePF2e<A> =>
            i.isOfType("ammo") || (i.isOfType("weapon") && i.isAmmoFor(weapon)),
    );
    return R.sortBy(ammo, (i) => i.sort);
}

export { getLoadedAmmo, processTwoHandTrait, upgradeWeaponTrait };
