import {isBlank, toNumber} from '../utils';
import {DamageDieSize, DamageCategory} from '../system/damage/damage';

// FIXME: point this to the correct type afterwards
type ItemPlaceholder = any;
type ItemDataPlaceholder = any;

export function getPropertySlots(itemData: ItemPlaceholder): number {
    let slots = 0;
    if (itemData?.data?.preciousMaterial?.value === 'orichalcum') {
        slots += 1;
    }
    const potencyRune = itemData?.data?.potencyRune?.value;
    if (!isBlank(potencyRune)) {
        slots += parseInt(potencyRune, 10);
    }
    return slots;
}

export function getPropertyRunes(itemData: ItemPlaceholder, slots: number): string[] {
    const runes = [];
    for (let i = 1; i <= slots; i += 1) {
        const rune = itemData.data[`propertyRune${i}`]?.value;
        if (!isBlank(rune)) {
            runes.push(rune);
        }
    }
    return runes;
}

export function getAttackBonus(itemData: ItemDataPlaceholder): number {
    if (itemData.group?.value === 'bomb') {
        return toNumber(itemData?.bonus?.value) ?? 0;
    }
    return toNumber(itemData?.potencyRune?.value) ?? 0;
}

export function getArmorBonus(itemData: ItemDataPlaceholder): number {
    const potencyRune = toNumber(itemData?.potencyRune?.value) ?? 0;
    const baseArmor = toNumber(itemData.armor.value) ?? 0;
    return baseArmor + potencyRune;
}

const strikingRuneValues = new Map<string, number>();
strikingRuneValues.set('striking', 1);
strikingRuneValues.set('greaterStriking', 2);
strikingRuneValues.set('majorStriking', 3);

export function getStrikingDice(itemData: ItemDataPlaceholder): number {
    return strikingRuneValues.get(itemData?.strikingRune?.value) || 0;
}

const resiliencyRuneValues = new Map<string, number>();
resiliencyRuneValues.set('resilient', 1);
resiliencyRuneValues.set('greaterResilient', 2);
resiliencyRuneValues.set('majorResilient', 3);

export function getResiliencyBonus(itemData: ItemDataPlaceholder): number {
    return resiliencyRuneValues.get(itemData?.resiliencyRune?.value) || 0;
}

interface DiceModifier {
    name: string;
    diceNumber: number;
    dieSize: DamageDieSize;
    category: string;
    damageType: string;
    enabled: boolean;
    traits: string[];
}


interface RuneDiceModifier {
    diceNumber?: number;
    dieSize?: DamageDieSize;
    damageType?: string;
}

function toModifier(rune, {damageType = undefined, dieSize = 'd6', diceNumber = 1}: RuneDiceModifier): DiceModifier {
    const traits = [];
    if (damageType !== undefined) {
        traits.push(damageType);
    }
    return {
        name: CONFIG.PF2E.weaponPropertyRunes[rune],
        diceNumber,
        dieSize,
        category: DamageCategory.fromDamageType(damageType),
        damageType,
        enabled: true,
        traits,
    };
}

const runeDamageModifiers = new Map<string, RuneDiceModifier>();
runeDamageModifiers.set('disrupting', {damageType: 'positive'});
runeDamageModifiers.set('corrosive', {damageType: 'acid'});
runeDamageModifiers.set('flaming', {damageType: 'fire'});
runeDamageModifiers.set('frost', {damageType: 'cold'});
runeDamageModifiers.set('shock', {damageType: 'electricity'});
runeDamageModifiers.set('thundering', {damageType: 'sonic'});
runeDamageModifiers.set('serrating', {dieSize: 'd4'});
runeDamageModifiers.set('anarchic', {damageType: 'chaotic'});
runeDamageModifiers.set('axiomatic', {damageType: 'lawful'});
runeDamageModifiers.set('holy', {damageType: 'good'});
runeDamageModifiers.set('unholy', {damageType: 'evil'});
runeDamageModifiers.set('greaterDisrupting', {damageType: 'positive', diceNumber: 2});
runeDamageModifiers.set('greaterCorrosive', {damageType: 'acid'});
runeDamageModifiers.set('greaterFlaming', {damageType: 'fire'});
runeDamageModifiers.set('greaterFrost', {damageType: 'cold'});
runeDamageModifiers.set('greaterShock', {damageType: 'electricity'});
runeDamageModifiers.set('greaterThundering', {damageType: 'sonic'});

export function getPropertyRuneModifiers(itemData: ItemPlaceholder): DiceModifier[] {
    const diceModifiers = [];
    for (const rune of getPropertyRunes(itemData, getPropertySlots(itemData))) {
        if (runeDamageModifiers.has(rune)) {
            const modifierConfig = runeDamageModifiers.get(rune);
            diceModifiers.push(toModifier(rune, modifierConfig));
        }
    }
    return diceModifiers;
}

export function hasGhostTouchRune(itemData: ItemPlaceholder): boolean {
    const runes = new Set(getPropertyRunes(itemData, getPropertySlots(itemData)));
    return runes.has('ghostTouch')
}