import { OneToFour, Rarity, ZeroToFour, ZeroToThree } from '@module/data';
import { DiceModifierPF2e } from '@module/modifiers';
import { isBlank, toNumber } from '@module/utils';
import { DamageDieSize } from '@system/damage/damage';
import type { ResilientRuneType } from './armor/data';
import type { ArmorData, WeaponData } from './data';
import type { StrikingRuneType, WeaponTrait } from './weapon/data';

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

export function getAttackBonus(itemData: WeaponData['data']): number {
    if (itemData.group?.value === 'bomb') {
        return toNumber(itemData?.bonus?.value) ?? 0;
    }
    return itemData.potencyRune.value ?? 0;
}

export function getArmorBonus(itemData: ArmorData['data']): number {
    const potencyRune = itemData.potencyRune.value;
    const baseArmor = toNumber(itemData.armor.value) ?? 0;
    return baseArmor + potencyRune;
}

const strikingRuneValues: Map<StrikingRuneType | null, ZeroToThree | undefined> = new Map([
    ['striking', 1],
    ['greaterStriking', 2],
    ['majorStriking', 3],
]);

export function getStrikingDice(itemData: WeaponData['data']): ZeroToThree {
    return strikingRuneValues.get(itemData.strikingRune.value) ?? 0;
}

const resilientRuneValues: Map<ResilientRuneType, ZeroToThree> = new Map([
    ['resilient', 1],
    ['greaterResilient', 2],
    ['majorResilient', 3],
]);
export function getResiliencyBonus(itemData: ArmorData['data']): ZeroToThree {
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

const runeDamageModifiers: Map<string, RuneDiceModifier> = new Map([
    ['disrupting', { damageType: 'positive' }],
    ['corrosive', { damageType: 'acid' }],
    ['flaming', { damageType: 'fire' }],
    ['frost', { damageType: 'cold' }],
    ['shock', { damageType: 'electricity' }],
    ['thundering', { damageType: 'sonic' }],
    ['serrating', { dieSize: 'd4' }],
    ['anarchic', { damageType: 'chaotic' }],
    ['axiomatic', { damageType: 'lawful' }],
    ['holy', { damageType: 'good' }],
    ['unholy', { damageType: 'evil' }],
    ['greaterDisrupting', { damageType: 'positive', diceNumber: 2 }],
    ['greaterCorrosive', { damageType: 'acid' }],
    ['greaterFlaming', { damageType: 'fire' }],
    ['greaterFrost', { damageType: 'cold' }],
    ['greaterShock', { damageType: 'electricity' }],
    ['greaterThundering', { damageType: 'sonic' }],
]);
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

/* -------------------------------------------- */
/*  Rune Valuation                              */
/* -------------------------------------------- */

export interface RuneValuationData {
    level: number;
    price: number;
    rarity: Rarity;
    traits: WeaponTrait[];
}

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
const POTENCY_RUNE_DATA: Record<OneToFour, RuneValuationData> = {
    1: { level: 2, price: 35, rarity: 'common', traits: ['evocation'] },
    2: { level: 10, price: 935, rarity: 'common', traits: ['evocation'] },
    3: { level: 16, price: 8935, rarity: 'common', traits: ['evocation'] },
    4: { level: 16, price: 8935, rarity: 'common', traits: ['evocation'] },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=25
const STRIKING_RUNE_DATA: Record<StrikingRuneType, RuneValuationData> = {
    striking: { level: 4, price: 65, rarity: 'common', traits: ['evocation'] },
    greaterStriking: { level: 12, price: 1065, rarity: 'common', traits: ['evocation'] },
    majorStriking: { level: 19, price: 31065, rarity: 'common', traits: ['evocation'] },
};

// https://2e.aonprd.com/Equipment.aspx?Category=23&Subcategory=27
export const WEAPON_PROPERTY_RUNE_TYPES = [
    'anarchic',
    'ancestralEchoing',
    'axiomatic',
    'bloodbane',
    'conducting',
    'corrosive',
    'cunning',
    'dancing',
    'disrupting',
    'fearsome',
    'flaming',
    'frost',
    'ghostTouch',
    'greaterBloodbane',
    'greaterCorrosive',
    'greaterDisrupting',
    'greaterFearsome',
    'greaterFlaming',
    'greaterFrost',
    'greaterShock',
    'greaterThundering',
    'grievous',
    'holy',
    'keen',
    'kinWarding',
    'pacifying',
    'returning',
    'serrating',
    'shifting',
    'shock',
    'speed',
    'spellStoring',
    'thundering',
    'unholy',
    'vorpal',
    'wounding',
] as const;

export const WEAPON_PROPERTY_RUNE_DATA: Record<WeaponPropertyRuneType, RuneValuationData> = {
    anarchic: { level: 11, price: 1400, rarity: 'common', traits: ['chaotic', 'evocation', 'magical'] },
    ancestralEchoing: {
        level: 15,
        price: 9500,
        rarity: 'rare',
        traits: ['dwarf', 'evocation', 'magical', 'saggorak'],
    },
    axiomatic: { level: 11, price: 1400, rarity: 'common', traits: ['evocation', 'lawful', 'magical'] },
    bloodbane: { level: 8, price: 475, rarity: 'uncommon', traits: ['dwarf', 'evocation', 'magical'] },
    conducting: { level: 7, price: 300, rarity: 'common', traits: ['evocation', 'magical'] },
    corrosive: { level: 8, price: 500, rarity: 'common', traits: ['acid', 'conjuration', 'magical'] },
    cunning: { level: 5, price: 140, rarity: 'uncommon', traits: ['divination', 'magical'] },
    dancing: { level: 13, price: 2700, rarity: 'uncommon', traits: ['evocation', 'magical'] },
    disrupting: { level: 5, price: 150, rarity: 'common', traits: ['magical', 'necromancy'] },
    fearsome: {
        level: 5,
        price: 160,
        rarity: 'common',
        traits: ['emotion', 'enchantment', 'fear', 'magical', 'mental'],
    },
    flaming: { level: 8, price: 500, rarity: 'common', traits: ['conjuration', 'fire', 'magical'] },
    frost: { level: 8, price: 500, rarity: 'common', traits: ['cold', 'conjuration', 'magical'] },
    ghostTouch: { level: 4, price: 75, rarity: 'common', traits: ['magical', 'transmutation'] },
    greaterBloodbane: { level: 13, price: 2800, rarity: 'uncommon', traits: ['dwarf', 'evocation', 'magical'] },
    greaterCorrosive: { level: 15, price: 6500, rarity: 'common', traits: ['acid', 'conjuration', 'magical'] },
    greaterDisrupting: { level: 14, price: 4300, rarity: 'common', traits: ['magical', 'necromancy'] },
    greaterFearsome: {
        level: 12,
        price: 2000,
        rarity: 'common',
        traits: ['emotion', 'enchantment', 'fear', 'magical', 'mental'],
    },
    greaterFlaming: { level: 15, price: 6500, rarity: 'common', traits: ['conjuration', 'fire', 'magical'] },
    greaterFrost: { level: 15, price: 6500, rarity: 'common', traits: ['cold', 'conjuration', 'magical'] },
    greaterShock: { level: 15, price: 6500, rarity: 'common', traits: ['electricity', 'evocation', 'magical'] },
    greaterThundering: { level: 15, price: 6500, rarity: 'common', traits: ['evocation', 'magical', 'sonic'] },
    grievous: { level: 9, price: 700, rarity: 'common', traits: ['enchantment', 'magical'] },
    holy: { level: 11, price: 1400, rarity: 'common', traits: ['evocation', 'good', 'magical'] },
    keen: { level: 13, price: 3000, rarity: 'uncommon', traits: ['magical', 'transmutation'] },
    kinWarding: { level: 3, price: 52, rarity: 'uncommon', traits: ['abjuration', 'dwarf', 'magical'] },
    pacifying: { level: 5, price: 150, rarity: 'uncommon', traits: ['enchantment', 'magical'] },
    returning: { level: 3, price: 55, rarity: 'common', traits: ['evocation', 'magical'] },
    serrating: { level: 10, price: 1000, rarity: 'uncommon', traits: ['evocation', 'magical'] },
    shifting: { level: 6, price: 225, rarity: 'common', traits: ['magical', 'transmutation'] },
    shock: { level: 8, price: 500, rarity: 'common', traits: ['electricity', 'evocation', 'magical'] },
    speed: { level: 16, price: 10000, rarity: 'rare', traits: ['magical', 'transmutation'] },
    spellStoring: { level: 13, price: 2700, rarity: 'uncommon', traits: ['abjuration', 'magical'] },
    thundering: { level: 8, price: 500, rarity: 'common', traits: ['evocation', 'magical', 'sonic'] },
    unholy: { level: 11, price: 1400, rarity: 'common', traits: ['evil', 'evocation', 'magical'] },
    vorpal: { level: 17, price: 15000, rarity: 'rare', traits: ['evocation', 'magical'] },
    wounding: { level: 7, price: 340, rarity: 'common', traits: ['magical', 'necromancy'] },
};

interface WeaponValuationData {
    potency: { 0: null } & Record<OneToFour, RuneValuationData>;
    striking: { '': null } & Record<StrikingRuneType, RuneValuationData>;
    property: { '': null } & Record<WeaponPropertyRuneType, RuneValuationData>;
}

export const WEAPON_VALUATION_DATA: WeaponValuationData = {
    potency: { 0: null, ...POTENCY_RUNE_DATA },
    striking: { '': null, ...STRIKING_RUNE_DATA },
    property: { '': null, ...WEAPON_PROPERTY_RUNE_DATA },
};
