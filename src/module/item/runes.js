import { isBlank } from '../utils.js';

export function getPropertySlots(itemData) {
    let slots = 0;
    if (itemData?.data?.preciousMaterial?.value === 'orichalcum') {
        slots += 1;
    }
    const potencyRune = itemData?.data?.potencyRune?.value;
    if (!isBlank(potencyRune)) {
        slots += parseInt(potencyRune, 10)
    }
    return slots;
}

export function getPropertyRunes(itemData, slots) {
    const runes = [];
    for (let i=1; i<=slots; i+=1) {
        const rune = itemData.data[`propertyRune${i}`]?.value;
        if (!isBlank(rune)) {
            runes.push(rune);
        }
    }
    return runes;
}