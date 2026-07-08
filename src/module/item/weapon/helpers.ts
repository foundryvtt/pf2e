import { ActorPF2e } from "@actor";
import { ConsumablePF2e } from "@item/consumable/document.ts";
import { nextDamageDieSize } from "@system/damage/helpers.ts";
import type { DamageDieSize } from "@system/damage/types.ts";
import { DAMAGE_DICE_FACES } from "@system/damage/values.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import { WeaponPF2e } from "./document.ts";

const TRAIT_DIE_SUFFIX = /-d(4|6|8|10|12)$/;

/** Upgrade a trait with a dice annotation, if possible, or otherwise return the original trait. */
function upgradeWeaponTrait<TTrait extends string>(trait: TTrait): TTrait;
function upgradeWeaponTrait(trait: string): string {
    const match = TRAIT_DIE_SUFFIX.exec(trait);
    const value = Number(match?.at(1));
    if (tupleHasValue(DAMAGE_DICE_FACES, value)) {
        const upgraded = nextDamageDieSize({ upgrade: `d${value}` });
        return trait.replace(new RegExp(String.raw`d${value}$`), upgraded);
    }
    return trait;
}

/** Downgrade a trait with a dice annotation, if possible, or otherwise return the original trait. */
function downgradeWeaponTrait<TTrait extends string>(trait: TTrait): TTrait;
function downgradeWeaponTrait(trait: string): string {
    const match = TRAIT_DIE_SUFFIX.exec(trait);
    const value = Number(match?.at(1));
    if (tupleHasValue(DAMAGE_DICE_FACES, value)) {
        const downgraded = nextDamageDieSize({ downgrade: `d${value}` as DamageDieSize });
        return trait.replace(new RegExp(String.raw`d${value}$`), downgraded);
    }
    return trait;
}

/**
 * When item alterations change weapon damage faces, keep an existing `two-hand-d*` trait in sync so
 * `processTwoHandTrait` still applies the correct two-hand die after the base die changes.
 */
function adjustTwoHandTraitForDamageFacesChange(weapon: WeaponPF2e, mode: "downgrade" | "override" | "upgrade"): void {
    const traits = weapon.system.traits;
    const index = traits.value.findIndex((t) => t.startsWith("two-hand-d"));
    if (index < 0) return;

    const twoHandTrait = traits.value[index];
    const newTrait = ((): string => {
        if (mode === "upgrade") return upgradeWeaponTrait(twoHandTrait);
        if (mode === "downgrade") return downgradeWeaponTrait(twoHandTrait);

        const currentDie = weapon.system.damage.die;
        if (!currentDie) return twoHandTrait;

        const dieFaces = Number(currentDie.replace("d", ""));
        const twoHandFaces = Number(twoHandTrait.replace("two-hand-d", ""));
        if (!tupleHasValue(DAMAGE_DICE_FACES, dieFaces) || !tupleHasValue(DAMAGE_DICE_FACES, twoHandFaces)) {
            return twoHandTrait;
        }
        if (twoHandFaces > dieFaces) return twoHandTrait;

        const upgraded = nextDamageDieSize({ upgrade: currentDie });
        const upgradedFaces = Number(upgraded.replace("d", ""));
        return upgradedFaces > dieFaces ? `two-hand-d${upgradedFaces}` : twoHandTrait;
    })();

    if (newTrait !== twoHandTrait) traits.value.splice(index, 1, newTrait as typeof twoHandTrait);
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

export { adjustTwoHandTraitForDamageFacesChange, getLoadedAmmo, processTwoHandTrait, upgradeWeaponTrait };
