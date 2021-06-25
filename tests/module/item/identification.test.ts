import { ArmorPF2e } from '@item/armor';
import { ConsumablePF2e } from '@item/consumable';
import { EquipmentPF2e } from '@item/equipment';
import { identifyItem, isMagical } from '@item/identification';
import { WeaponPF2e } from '@item/weapon';
import { Rarity } from '@module/data';
import { FakeItem } from 'tests/fakes/fake-item';

interface TestItemData<T extends WeaponPF2e | ArmorPF2e | ConsumablePF2e = WeaponPF2e> {
    level: number;
    rarity: Rarity;
    traits?: string[];
    potencyRune?: string;
    strikingRune?: string;
    resilienceRune?: string;
    type?: T['data']['type'];
}

function createItem<T extends WeaponPF2e>(data: TestItemData<T>): T;
function createItem<T extends ArmorPF2e>(data: TestItemData<T>): T;
function createItem<T extends ConsumablePF2e>(data: TestItemData<T>): T;
function createItem(data: TestItemData): WeaponPF2e;
function createItem<T extends WeaponPF2e | ArmorPF2e>({
    level,
    rarity,
    traits,
    potencyRune,
    strikingRune,
    resilienceRune,
    type = 'weapon',
}: TestItemData<T>): T {
    return new FakeItem({
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
                custom: '',
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
        } as unknown as T['data']['data'],
    } as T['data']) as unknown as T;
}

describe('test identification DCs', () => {
    test('identify normal item', () => {
        const item = createItem({ level: 2, rarity: 'common', traits: ['magical'] });
        const dcs = identifyItem(item, { notMatchingTraditionModifier: 5 });
        expect(dcs).toEqual({
            arc: 16,
            nat: 16,
            occ: 16,
            rel: 16,
        });
    });

    test('identify rare item', () => {
        const item = createItem({ level: 2, rarity: 'rare', traits: ['magical'] });
        const dcs = identifyItem(item, { notMatchingTraditionModifier: 5 });
        expect(dcs).toEqual({
            arc: 21,
            nat: 21,
            occ: 21,
            rel: 21,
        });
    });

    test('identify rare item with tradition', () => {
        const item = createItem({ level: 2, rarity: 'rare', traits: ['primal', 'occult'] });
        const dcs = identifyItem(item, { notMatchingTraditionModifier: 3 });
        expect(dcs).toEqual({
            arc: 24,
            nat: 21,
            occ: 21,
            rel: 24,
        });
    });

    test('identify rare alchemical ingredient', () => {
        const item = createItem({ type: 'consumable', level: 2, rarity: 'rare', traits: ['alchemical'] });
        const dcs = identifyItem(item, { notMatchingTraditionModifier: 3 });
        expect(dcs).toEqual({
            cra: 21,
        });
    });

    test('identify item without level', () => {
        const item = {
            data: {
                data: {
                    traits: {
                        value: [],
                        rarity: { value: 'common' },
                    },
                },
            },
        } as unknown as EquipmentPF2e;
        const dcs = identifyItem(item, { notMatchingTraditionModifier: 3 });
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
        }) as unknown as WeaponPF2e;
        expect(isMagical(item.data)).toBe(true);
    });

    test('striking runes are magical', () => {
        const item = createItem({
            level: 2,
            rarity: 'rare',
            traits: [],
            strikingRune: '2',
        });
        expect(isMagical(item.data)).toBe(true);
    });

    test('resiliency runes are magical', () => {
        const item = createItem({
            level: 2,
            rarity: 'rare',
            traits: [],
            resilienceRune: '3',
            type: 'armor',
        });
        expect(isMagical(item.data)).toBe(true);
    });
});
