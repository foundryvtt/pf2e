import {PhysicalItemData, Rarity} from '../../../src/module/item/dataDefinitions';
import {identifyItem, isMagical} from '../../../src/module/item/identification';

interface TestItemData {
    level: number;
    rarity: Rarity;
    traits?: string[];
    potencyRune?: string;
    strikingRune?: string;
    resilienceRune?: string;
    type?: string;
}

function createItem(
    {
        level,
        rarity,
        traits,
        potencyRune,
        strikingRune,
        resilienceRune,
        type,
    }: TestItemData,
): PhysicalItemData {
    return {
        type,
        data: {
            level: {
                value: level,
            },
            traits: {
                value: traits,
                rarity: {
                    value: rarity,
                },
            },
            potencyRune: {
                value: potencyRune,
            },
            strikingRune: {
                value: strikingRune,
            },
            resiliencyRune: {
                value: resilienceRune,
            },
        },
    } as unknown as PhysicalItemData;
}

describe('test identification DCs', () => {
    test('identify normal item', () => {
        const item = createItem({level: 2, rarity: 'common', traits: ['magical']});
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 5});
        expect(dcs).toEqual({
            arc: 16,
            nat: 16,
            occ: 16,
            rel: 16,
        });
    });

    test('identify rare item', () => {
        const item = createItem({level: 2, rarity: 'rare', traits: ['magical']});
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 5});
        expect(dcs).toEqual({
            arc: 21,
            nat: 21,
            occ: 21,
            rel: 21,
        });
    });

    test('identify rare item with tradition', () => {
        const item = createItem({level: 2, rarity: 'rare', traits: ['primal', 'occult']});
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 3});
        expect(dcs).toEqual({
            arc: 24,
            nat: 21,
            occ: 21,
            rel: 24,
        });
    });

    test('identify rare alchemical ingredient', () => {
        const item = createItem({level: 2, rarity: 'rare', traits: ['alchemical']});
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 3});
        expect(dcs).toEqual({
            cra: 21,
        });
    });

    test('identify item without level', () => {
        const item = {
            data: {
                rarity: {
                    value: 'common',
                },
                traits: {
                    value: [],
                },
            },
        } as PhysicalItemData;
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 3});
        expect(dcs).toEqual({
            dc: 14,
        });
    });

    test('potency runes are magical', () => {
        const item = createItem({
            level: 2, 
            rarity: 'rare', 
            traits: [], 
            potencyRune: '1', 
            type: 'weapon'
        });
        expect(isMagical(item))
            .toBe(true);
    });

    test('striking runes are magical', () => {
        const item = createItem({
            level: 2, 
            rarity: 'rare', 
            traits: [], 
            strikingRune: '2',  
            type: 'weapon'
        });
        expect(isMagical(item))
            .toBe(true);
    });

    test('resiliency runes are magical', () => {
        const item = createItem({
            level: 2, 
            rarity: 'rare', 
            traits: [], 
            resilienceRune: '3',  
            type: 'armor'
        });
        expect(isMagical(item))
            .toBe(true);
    });
});