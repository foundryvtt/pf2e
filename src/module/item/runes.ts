import {isBlank, toNumber} from '../utils';
import {DamageDieSize, getDamageCategory} from '../system/damage/damage';

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

function toModifier(rune, {damageType, dieSize = 'd6', diceNumber = 1}: Partial<DiceModifier> = {}): DiceModifier {
    return {
        name: CONFIG.PF2E.weaponPropertyRunes[rune],
        diceNumber,
        dieSize,
        category: getDamageCategory(damageType),
        damageType,
        enabled: true,
        traits: [damageType],
    };
}


const runeDamageModifiers = new Map<string, DiceModifier>();

// needs to be memoized because translation object is not available from the beginning
export function registerRuneValues() {
    runeDamageModifiers.set('disrupting', toModifier({damageType: 'positive'}));
    runeDamageModifiers.set('corrosive', toModifier({damageType: 'acid'}));
    runeDamageModifiers.set('flaming', toModifier({damageType: 'fire'}));
    runeDamageModifiers.set('frost', toModifier({damageType: 'cold'}));
    runeDamageModifiers.set('shock', toModifier({damageType: 'electricity'}));
    runeDamageModifiers.set('thundering', toModifier({damageType: 'sonic'}));
    runeDamageModifiers.set('serrating', toModifier({damageType: 'slashing', dieSize: 'd4'}));
    runeDamageModifiers.set('anarchic', toModifier({damageType: 'chaotic'}));
    runeDamageModifiers.set('axiomatic', toModifier({damageType: 'lawful'}));
    runeDamageModifiers.set('holy', toModifier({damageType: 'good'}));
    runeDamageModifiers.set('unholy', toModifier({damageType: 'evil'}));
    runeDamageModifiers.set('dancing', toModifier({damageType: 'fire'}));
    runeDamageModifiers.set('greaterDisrupting', toModifier({damageType: 'positive', diceNumber: 2}));
    runeDamageModifiers.set('greaterCorrosive', toModifier({damageType: 'acid'}));
    runeDamageModifiers.set('greaterFlaming', toModifier({damageType: 'fire'}));
    runeDamageModifiers.set('greaterFrost', toModifier({damageType: 'cold'}));
    runeDamageModifiers.set('greaterShock', toModifier({damageType: 'electricity'}));
    runeDamageModifiers.set('greaterThundering', toModifier({damageType: 'sonic'}));
    runeDamageModifiers.set('ancestralEchoing', toModifier({damageType: 'fire'}));
}

export function getPropertyRuneModifiers(itemData: ItemPlaceholder): DiceModifier[] {
    const diceModifiers = [];
    for (const rune of getPropertyRunes(itemData, 4)) {
        console.log(rune);
        if (runeDamageModifiers.has(rune)) {
            diceModifiers.push(runeDamageModifiers.get(rune));
        }
    }
    return diceModifiers;
}

export function hasGhostTouchRune(itemData: ItemPlaceholder): boolean {
    const runes = new Set(getPropertyRunes(itemData, 4));
    return runes.has('ghostTouch')
}