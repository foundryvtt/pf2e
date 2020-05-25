import { isBlank } from '../utils.js';

const critTraitRegex = /(\bdeadly\b|\bfatal\b)-(d\d+)/;
const thrownRegex = /(\bthrown\b)-(\d+)/;

const materialAddsDamageType = new Set();
materialAddsDamageType.add('silver');
materialAddsDamageType.add('coldIron');

export class WeaponDamageDie {
    constructor({
        die = 'd4',
        rolls = 1,
        damageTypes = ['slashing'],
    } = {}) {
        this.die = die;
        this.rolls = rolls;
        this.damageTypes = damageTypes;
    }
}

function getDie(itemData) {
    const traits = itemData.data?.traits?.value ?? [];
    const twoHandedTrait = traits.find(trait => trait.startsWith('two-hand-d'))
    if (itemData.data?.hands && twoHandedTrait) {
        return twoHandedTrait.replace('two-hand-', '');
    } 
    return itemData.data.damage.die;
}

function isMagical(itemData) {
    return !isBlank(itemData.data?.potencyRune?.value) 
        || !isBlank(itemData.data?.strikingRune?.value);
}

function getStrikingDice(strikingRune) {
    if (strikingRune === 'striking') {
        return 1;
    }
    if (strikingRune === 'greaterStriking') {
        return 2;
    }
    if (strikingRune === 'majorStriking') {
        return 3;
    }
    return 0;
}

/**
 * Gets all dice that should be rolled for a weapon
 * @param itemData
 */
export function calculateWeaponDamageDice(itemData) {
    const {dice, damageType} = itemData.data.damage;

    const damageTypes = [damageType];
    
    if (isMagical(itemData)) {
        damageTypes.push('magical');
    }
    const material = itemData.data?.preciousMaterial?.value;
    if (materialAddsDamageType.has(material)) {
        damageTypes.push(material);
    }

    const strikingDice = getStrikingDice(itemData.data?.strikingRune?.value);
    const weaponDamageDie = new WeaponDamageDie({
        die: getDie(itemData),
        rolls: dice + strikingDice,
        damageTypes,
    });
    return [weaponDamageDie];
}


