import { ActorPF2e } from "@actor";
import { ConsumablePF2e } from "@item/consumable/document.ts";
import { PhysicalItemPF2e } from "@item/physical/document.ts";
import { OneToFour } from "@module/data.ts";
import { nextDamageDieSize } from "@system/damage/helpers.ts";
import { DAMAGE_DICE_FACES } from "@system/damage/values.ts";
import { setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";
import { WeaponPF2e } from "./document.ts";
import { WeaponPropertyRuneType } from "./types.ts";
import { WEAPON_PROPERTY_RUNE_TYPES } from "./values.ts";

const POTENCY_VALUES = {
    "weapon-potency-1": 1,
    "weapon-potency-2": 2,
    "weapon-potency-3": 3,
    "mythic-weapon-potency": 4,
} as const;

const STRIKING_VALUES = {
    striking: 1,
    "striking-greater": 2,
    "striking-major": 3,
    "mythic-striking": 4,
} as const;

function isWeaponPotencyRune(item: PhysicalItemPF2e): item is PhysicalItemPF2e & { slug: keyof typeof POTENCY_VALUES } {
    // A better way than using slug would be nice
    return (item.slug as string) in POTENCY_VALUES;
}

function isWeaponStrikingRune(
    item: PhysicalItemPF2e,
): item is PhysicalItemPF2e & { slug: keyof typeof STRIKING_VALUES } {
    return (item.slug as string) in STRIKING_VALUES;
}

function isWeaponPropertyRune(item: PhysicalItemPF2e): item is PhysicalItemPF2e & { slug: WeaponPropertyRuneType } {
    return setHasElement(WEAPON_PROPERTY_RUNE_TYPES, item.slug);
}

function getHighestPotencyRuneValue(item: WeaponPF2e): OneToFour | undefined {
    return R.pipe(
        item.subitems.contents,
        R.filter(isWeaponPotencyRune),
        R.map((i) => POTENCY_VALUES[i.slug]),
        R.firstBy([R.identity(), "desc"]),
    );
}

function getHighestStrikingRuneValue(item: WeaponPF2e): OneToFour | undefined {
    return R.pipe(
        item.subitems.contents,
        R.filter(isWeaponStrikingRune),
        R.map((i) => STRIKING_VALUES[i.slug]),
        R.firstBy([R.identity(), "desc"]),
    );
}

function getWeaponPropertyRunes(item: WeaponPF2e): WeaponPropertyRuneType[] {
    return R.pipe(
        item.subitems.contents,
        R.filter(isWeaponPropertyRune),
        R.map((i) => i.slug),
    );
}

function setRunesFromAttachments(item: WeaponPF2e): void {
    item.system.runes.potency = getHighestPotencyRuneValue(item) ?? 0;
    item.system.runes.striking = getHighestStrikingRuneValue(item) ?? 0;
    item.system.runes.property = getWeaponPropertyRunes(item);
}

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

export { getLoadedAmmo, isWeaponPotencyRune, processTwoHandTrait, setRunesFromAttachments, upgradeWeaponTrait };
