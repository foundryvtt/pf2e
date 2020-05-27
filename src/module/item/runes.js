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
    const potencyRune = itemData?.potencyRune?.value ?? '';
    const bonusAtk = toNumber(itemData.bonus.value) ?? 0;
    if (bonusAtk !== 0) {
        return bonusAtk;
    }
    if (!isBlank(potencyRune)) {
        return parseInt(potencyRune, 10);
    }
    return 0;
}

export function getArmorBonus(itemData) {
    const potencyRune = toNumber(itemData?.potencyRune?.value) ?? 0;
    const baseArmor = toNumber(itemData.armor.value) ?? 0;
    return baseArmor + potencyRune;
}