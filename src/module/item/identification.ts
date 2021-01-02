/**
 * Implementation of Identify Magic and Identify Alchemy Rules for items
 * https://2e.aonprd.com/Actions.aspx?ID=24
 * https://2e.aonprd.com/Actions.aspx?ID=44
 *
 * See https://www.youtube.com/watch?v=MJ7gUq9InBk for interpretations
 */

import { isLevelItem, PhysicalItemData } from './dataDefinitions';
import { isBlank, toNumber } from '../utils';
import { parseTraits } from '../traits';
import { adjustDCByRarity, calculateDC, DCOptions } from '../dc';

const magicTraditions = new Set(['arcane', 'primal', 'divine', 'occult']);

function getTraits(itemData: PhysicalItemData): Set<string> {
    return new Set(parseTraits(itemData?.data?.traits?.value));
}

/**
 * Extract all traits from an item, that match a magic tradition
 * @param itemData
 */
function getMagicTraditions(itemData: PhysicalItemData): Set<string> {
    const traits = getTraits(itemData);
    const result = new Set<string>();
    for (const trait of traits) {
        if (magicTraditions.has(trait)) {
            result.add(trait);
        }
    }
    return result;
}

function isCursed(itemData: PhysicalItemData) {
    return getTraits(itemData).has('cursed');
}

/**
 * All cursed items are incredibly hard to identify
 * @param itemData
 */
function getDcRarity(itemData: PhysicalItemData) {
    if (isCursed(itemData)) {
        return 'unique';
    } else {
        return itemData.data.traits.rarity?.value ?? 'common';
    }
}

export class IdentifyMagicDCs {
    // eslint-disable-next-line no-useless-constructor
    constructor(
        public arc: number,
        public nat: number,
        public rel: number,
        public occ: number, // eslint-disable-next-line no-empty-function
    ) {}
}

export class IdentifyAlchemyDCs {
    // eslint-disable-next-line no-useless-constructor,no-empty-function
    constructor(public cra: number) {}
}

export class GenericIdentifyDCs {
    // eslint-disable-next-line no-useless-constructor,no-empty-function
    constructor(public dc: number) {}
}

function identifyMagic(itemData: PhysicalItemData, baseDc: number, notMatchingTraditionModifier: number) {
    const result = {
        occult: baseDc,
        primal: baseDc,
        divine: baseDc,
        arcane: baseDc,
    };
    const traditions = getMagicTraditions(itemData);
    for (const key of Object.keys(result)) {
        // once an item has a magic tradition, all skills
        // that don't match the tradition are hard
        if (traditions.size > 0 && !traditions.has(key)) {
            result[key] = baseDc + notMatchingTraditionModifier;
        }
    }
    return new IdentifyMagicDCs(result.arcane, result.primal, result.divine, result.occult);
}

function hasRunes(itemData: PhysicalItemData): boolean {
    if (itemData.type === 'weapon') {
        return !isBlank(itemData.data.potencyRune?.value) || !isBlank(itemData.data.strikingRune?.value);
    } else if (itemData.type === 'armor') {
        return !isBlank(itemData.data.potencyRune?.value) || !isBlank(itemData.data.resiliencyRune?.value);
    } else {
        return false;
    }
}

export function isMagical(itemData: PhysicalItemData): boolean {
    const traits = getTraits(itemData);
    return (
        traits.has('magical') || hasRunes(itemData) || Array.from(magicTraditions).some((trait) => traits.has(trait))
    );
}

function isAlchemical(itemData: PhysicalItemData): boolean {
    return getTraits(itemData).has('alchemical');
}

interface IdentifyItemOptions extends DCOptions {
    notMatchingTraditionModifier: number;
}

export function identifyItem(
    itemData: PhysicalItemData,
    { proficiencyWithoutLevel = false, notMatchingTraditionModifier }: IdentifyItemOptions,
): GenericIdentifyDCs | IdentifyMagicDCs | IdentifyAlchemyDCs {
    const level = isLevelItem(itemData) ? toNumber(itemData.data.level?.value) ?? 0 : 0;
    const dc = calculateDC(level, { proficiencyWithoutLevel });
    const rarity = getDcRarity(itemData);
    const baseDc = adjustDCByRarity(dc, rarity);
    if (isMagical(itemData)) {
        return identifyMagic(itemData, baseDc, notMatchingTraditionModifier);
    } else if (isAlchemical(itemData)) {
        return new IdentifyAlchemyDCs(baseDc);
    } else {
        return new GenericIdentifyDCs(baseDc);
    }
}
