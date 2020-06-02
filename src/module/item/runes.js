import { isBlank, toNumber } from '../utils.js';

export function getPropertySlots(itemData) {
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

export function getPropertyRunes(itemData, slots) {
    const runes = [];
    for (let i = 1; i <= slots; i += 1) {
        const rune = itemData.data[`propertyRune${i}`]?.value;
        if (!isBlank(rune)) {
            runes.push(rune);
        }
    }
    return runes;
}

export function getAttackBonus(itemData) {
    if (itemData.group?.value === 'bomb') {
        return toNumber(itemData?.bonus?.value) ?? 0;
    }
    return toNumber(itemData?.potencyRune?.value) ?? 0;
}

export function getArmorBonus(itemData) {
    const potencyRune = toNumber(itemData?.potencyRune?.value) ?? 0;
    const baseArmor = toNumber(itemData.armor.value) ?? 0;
    return baseArmor + potencyRune;
}

const strikingRuneValues = new Map();
strikingRuneValues.set('striking', 1);
strikingRuneValues.set('greaterStriking', 2);
strikingRuneValues.set('majorStriking', 3);

export function getStrikingDice(itemData) {
    return strikingRuneValues.get(itemData?.strikingRune?.value) || 0;
}

const resiliencyRuneValues = new Map();
resiliencyRuneValues.set('resilient', 1);
resiliencyRuneValues.set('greaterResilient', 2);
resiliencyRuneValues.set('majorResilient', 3);

export function getResiliencyBonus(itemData) {
    return resiliencyRuneValues.get(itemData?.resiliencyRune?.value) || 0;
}