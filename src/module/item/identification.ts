/**
 * Implementation of Identify Magic and Identify Alchemy Rules for items
 * https://2e.aonprd.com/Actions.aspx?ID=24
 * https://2e.aonprd.com/Actions.aspx?ID=44
 *
 * See https://www.youtube.com/watch?v=MJ7gUq9InBk for interpretations
 */

import { PhysicalItemData } from './data';
import { adjustDCByRarity, calculateDC, DCOptions } from '../dc';
import { PhysicalItemPF2e } from './physical';

const magicTraditions = new Set(['arcane', 'primal', 'divine', 'occult']);

function getTraits(itemData: PhysicalItemData): Set<string> {
    return new Set(itemData.data.traits.value);
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
        return !!(itemData.data.potencyRune.value || itemData.data.strikingRune.value);
    } else if (itemData.type === 'armor') {
        return !!(itemData.data.potencyRune.value || itemData.data.resiliencyRune.value);
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

interface IdentifyItemOptions extends DCOptions {
    notMatchingTraditionModifier: number;
}

export function identifyItem(
    item: PhysicalItemPF2e,
    { proficiencyWithoutLevel = false, notMatchingTraditionModifier }: IdentifyItemOptions,
): GenericIdentifyDCs | IdentifyMagicDCs | IdentifyAlchemyDCs {
    const dc = calculateDC(item.level, { proficiencyWithoutLevel });
    const rarity = getDcRarity(item.data);
    const baseDc = adjustDCByRarity(dc, rarity);
    if (item.isMagical) {
        return identifyMagic(item.data, baseDc, notMatchingTraditionModifier);
    } else if (item.isAlchemical) {
        return new IdentifyAlchemyDCs(baseDc);
    } else {
        return new GenericIdentifyDCs(baseDc);
    }
}

export function getUnidentifiedPlaceholderImage(itemData: PhysicalItemData): string {
    const traits = getTraits(itemData);
    let iconName = 'adventuring_gear';
    switch (itemData.type) {
        case 'weapon':
            if (traits.has('bomb')) {
                iconName = 'alchemical_bomb';
            } else if (traits.has('staff')) {
                iconName = 'staves';
            } else if (traits.has('artifact')) {
                iconName = 'artifact';
            } else {
                iconName = 'weapon';
            }
            break;
        case 'armor':
            iconName = itemData.data.armorType.value === 'shield' ? 'shields' : 'armor';
            break;
        case 'consumable':
            switch (itemData.data.consumableType.value as string) {
                case 'ammo':
                    iconName = 'ammunition';
                    break;
                case 'oil':
                    iconName = 'oils';
                    break;
                case 'scroll':
                    iconName = 'infernal-contracts';
                    break;
                case 'talisman':
                    iconName = 'talisman';
                    break;
                case 'elixir':
                case 'mutagen':
                    iconName = 'alchemical_elixir';
                    break;
                case 'poison':
                    iconName = 'alchemical_poison';
                    break;
                case 'tool':
                    iconName = 'alchemical_tool';
                    break;
                case 'wand':
                    iconName = 'wands';
                    break;
                case 'potion':
                    iconName = 'potions';
                    break;
                case 'snare':
                case 'other':
                default:
                    if (traits.has('drug')) {
                        iconName = 'drugs';
                    } else {
                        iconName = 'other-consumables';
                    }
                    break;
            }
            break;
        case 'equipment':
            if (traits.has('precious')) {
                iconName = 'material-chunk';
            }
            break;
        default:
            iconName = 'adventuring_gear';
            break;
    }

    return `systems/pf2e/icons/unidentified_item_icons/${iconName}.webp`;
}
