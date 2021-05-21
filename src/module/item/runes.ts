import { isBlank, toNumber } from '../utils';
import { DamageDieSize } from '../system/damage/damage';
import {
    ArmorData,
    ArmorDetailsData,
    ResilientRuneType,
    StrikingRuneType,
    WeaponData,
    WeaponDetailsData,
} from './data/types';
import { DiceModifierPF2e } from '../modifiers';
import { ConfigPF2e } from '@scripts/config';
import { ZeroToFour, ZeroToThree } from '@actor/data-definitions';

type WeaponPropertyRuneType = keyof ConfigPF2e['PF2E']['weaponPropertyRunes'];

export function getPropertySlots(itemData: WeaponData | ArmorData): ZeroToFour {
    let slots = 0;
    if (itemData.data.preciousMaterial?.value === 'orichalcum') {
        slots += 1;
    }
    let potencyRune = itemData.data.potencyRune?.value;
    if (game.settings.get('pf2e', 'automaticBonusVariant') !== 'noABP') {
        potencyRune = 0;
        slots += getPropertyRunes(itemData, 4).length;
        slots += 1;
    }
    if (potencyRune) {
        slots += potencyRune;
    }
    return slots as ZeroToFour;
}

export function getPropertyRunes(itemData: WeaponData | ArmorData, slots: number): WeaponPropertyRuneType[] {
    const runes: WeaponPropertyRuneType[] = [];
    type RuneIndex = 'propertyRune1' | 'propertyRune2' | 'propertyRune3' | 'propertyRune4';
    for (let i = 1; i <= slots; i += 1) {
        const rune = itemData.data[`propertyRune${i}` as RuneIndex]?.value as WeaponPropertyRuneType | undefined;
        if (!isBlank(rune)) {
            runes.push(rune);
        }
    }
    return runes;
}

export function getAttackBonus(itemData: WeaponDetailsData): number {
    if (itemData.group?.value === 'bomb') {
        return toNumber(itemData?.bonus?.value) ?? 0;
    }
    return itemData.potencyRune.value;
}

export function getArmorBonus(itemData: ArmorDetailsData): number {
    const potencyRune = itemData.potencyRune.value;
    const baseArmor = toNumber(itemData.armor.value) ?? 0;
    return baseArmor + potencyRune;
}

const strikingRuneValues: Map<StrikingRuneType | '', ZeroToThree> = new Map([
    ['striking', 1],
    ['greaterStriking', 2],
    ['majorStriking', 3],
]);

export function getStrikingDice(itemData: WeaponDetailsData): ZeroToThree {
    return strikingRuneValues.get(itemData.strikingRune.value) ?? 0;
}

const resilientRuneValues: Map<ResilientRuneType, ZeroToThree> = new Map([
    ['resilient', 1],
    ['greaterResilient', 2],
    ['majorResilient', 3],
]);
export function getResiliencyBonus(itemData: ArmorDetailsData): ZeroToThree {
    return resilientRuneValues.get(itemData?.resiliencyRune?.value) ?? 0;
}

interface RuneDiceModifier {
    diceNumber?: number;
    dieSize?: DamageDieSize;
    damageType?: string;
}

function toModifier(
    rune: WeaponPropertyRuneType,
    { damageType = undefined, dieSize = 'd6', diceNumber = 1 }: RuneDiceModifier,
): DiceModifierPF2e {
    const traits: string[] = [];
    if (damageType) {
        traits.push(damageType);
    }
    return new DiceModifierPF2e({
        name: CONFIG.PF2E.weaponPropertyRunes[rune],
        diceNumber,
        dieSize,
        damageType,
        traits,
    });
}

const runeDamageModifiers = new Map<string, RuneDiceModifier>();
runeDamageModifiers.set('disrupting', { damageType: 'positive' });
runeDamageModifiers.set('corrosive', { damageType: 'acid' });
runeDamageModifiers.set('flaming', { damageType: 'fire' });
runeDamageModifiers.set('frost', { damageType: 'cold' });
runeDamageModifiers.set('shock', { damageType: 'electricity' });
runeDamageModifiers.set('thundering', { damageType: 'sonic' });
runeDamageModifiers.set('serrating', { dieSize: 'd4' });
runeDamageModifiers.set('anarchic', { damageType: 'chaotic' });
runeDamageModifiers.set('axiomatic', { damageType: 'lawful' });
runeDamageModifiers.set('holy', { damageType: 'good' });
runeDamageModifiers.set('unholy', { damageType: 'evil' });
runeDamageModifiers.set('greaterDisrupting', { damageType: 'positive', diceNumber: 2 });
runeDamageModifiers.set('greaterCorrosive', { damageType: 'acid' });
runeDamageModifiers.set('greaterFlaming', { damageType: 'fire' });
runeDamageModifiers.set('greaterFrost', { damageType: 'cold' });
runeDamageModifiers.set('greaterShock', { damageType: 'electricity' });
runeDamageModifiers.set('greaterThundering', { damageType: 'sonic' });

export function getPropertyRuneModifiers(itemData: WeaponData | ArmorData): DiceModifierPF2e[] {
    const diceModifiers: DiceModifierPF2e[] = [];
    for (const rune of getPropertyRunes(itemData, getPropertySlots(itemData))) {
        const modifierConfig = runeDamageModifiers.get(rune);
        if (modifierConfig) {
            diceModifiers.push(toModifier(rune, modifierConfig));
        }
    }
    return diceModifiers;
}

export function hasGhostTouchRune(itemData: WeaponData): boolean {
    const runes = new Set(getPropertyRunes(itemData, getPropertySlots(itemData)));
    return runes.has('ghostTouch');
}
