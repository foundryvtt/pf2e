import {PhysicalItemData, Rarity} from '../../../src/module/item/dataDefinitions';
import {identifyItem} from '../../../src/module/item/identification';

function createItem(level: number, rarity: Rarity, traits: string[]): PhysicalItemData {
    return {
        data: {
            level: {
                value: level,
            },
            rarity: {
                value: rarity,
            },
            traits: {
                value: traits,
            },
        },
    } as PhysicalItemData;
}

describe('test identification DCs', () => {
    test('identify normal item', () => {
        const item = createItem(2, 'common', ['magical']);
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 5});
        expect(dcs).toEqual({
            arc: 16,
            nat: 16,
            occ: 16,
            rel: 16,
        });
    });

    test('identify rare item', () => {
        const item = createItem(2, 'rare', ['magical']);
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 5});
        expect(dcs).toEqual({
            arc: 21,
            nat: 21,
            occ: 21,
            rel: 21,
        });
    });

    test('identify rare item with tradition', () => {
        const item = createItem(2, 'rare', ['primal', 'occult']);
        const dcs = identifyItem(item, {notMatchingTraditionModifier: 3});
        expect(dcs).toEqual({
            arc: 24,
            nat: 21,
            occ: 21,
            rel: 24,
        });
    });

    test('identify rare alchemical ingredient', () => {
        const item = createItem(2, 'rare', ['alchemical']);
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
});