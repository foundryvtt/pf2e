import { FakeActor } from 'tests/fakes/fake-actor';
import { populateFoundryUtilFunctions } from 'tests/fixtures/foundryshim';
import {
    ArmorData,
    EquipmentData,
    ItemDataPF2e,
    ItemLevelData,
    PhysicalItemData,
    TreasureData,
    TreasureDetailsData,
    WeaponData,
} from '@item/data-definitions';
import {
    addCoins,
    attemptToRemoveCoinsByValue,
    calculateValueOfCurrency,
    calculateTotalWealth,
    calculateWealth,
    sellAllTreasure,
} from '@module/item/treasure';
import { ActorDataPF2e } from '@actor/data-definitions';
import { ActorPF2e } from '@actor/base';
import { FakeItem } from 'tests/fakes/fake-item';

function treasure({
    id = 'unknown',
    denomination = 'gp',
    value = 1,
    quantity = 1,
    stackGroup = 'unknown',
    containerId = undefined,
}): TreasureData {
    return {
        _id: id,
        name: id,
        type: 'treasure',
        img: 'icons/svg/mystery-man.svg',
        permission: {},
        sort: 1,
        flags: {},
        effects: [],
        data: ({
            level: 0,
            denomination: { value: denomination as 'cp' | 'sp' | 'gp' | 'pp' },
            quantity: { value: quantity },
            value: { value: value },
            stackGroup: { value: stackGroup },
            containerId: { value: containerId },
        } as unknown) as TreasureDetailsData & ItemLevelData,
    };
}
function coin({
    denomination,
    quantity,
    id = 'unknown',
    containerId = undefined,
}: {
    denomination: any;
    quantity: number;
    id?: string;
    containerId?: any;
}) {
    return treasure({ denomination, value: 1, quantity, stackGroup: 'coins', id, containerId });
}

describe('should calculate wealth based on inventory', () => {
    populateFoundryUtilFunctions();

    test('empty inventory', () => {
        const items: PhysicalItemData[] = [];

        const result = calculateWealth(items);
        expect(result).toEqual({
            pp: 0,
            gp: 0,
            sp: 0,
            cp: 0,
        });
    });

    test('handles empty treasure data without failing', () => {
        const items = [
            {
                _id: 'ignore',
                type: 'no treasure type',
                data: {},
            },
            coin({ denomination: 'gp', quantity: 1 }),
        ] as PhysicalItemData[];

        const result = calculateWealth(items);
        expect(result).toEqual({
            pp: 0,
            gp: 1,
            sp: 0,
            cp: 0,
        });
    });

    test('sums up treasure', () => {
        const items = [
            {
                _id: 'ignore',
                type: 'no treasure type',
                data: {
                    denomination: {
                        value: 'gp',
                    },
                    quantity: {
                        value: 1000,
                    },
                    value: {
                        value: 1000,
                    },
                },
            },
            coin({ denomination: 'pp', quantity: 10 }),
            coin({ denomination: 'gp', quantity: 9 }),
            coin({ denomination: 'sp', quantity: 8 }),
            coin({ denomination: 'cp', quantity: 7 }),
        ] as PhysicalItemData[];

        const result = calculateWealth(items);
        expect(result).toEqual({
            pp: 10,
            gp: 9,
            sp: 8,
            cp: 7,
        });
    });

    test('adjusts value', () => {
        // eslint-disable-next-line prettier/prettier
        const items = [
            treasure({ denomination: 'pp', value: 10, quantity: 2 }),
            treasure({ denomination: 'gp', value: 9, quantity: 3 }),
            treasure({ denomination: 'sp', value: 8, quantity: 4 }),
            treasure({ denomination: 'cp', value: 7, quantity: 5 }),
        ];

        const result = calculateWealth(items);
        expect(result).toEqual({
            pp: 20,
            gp: 27,
            sp: 32,
            cp: 35,
        });
    });

    test('should be able to add coins to an existing stack', async () => {
        const actor: any = new FakeActor({
            items: [
                // ignored because of only value 1 is taken
                treasure({ denomination: 'gp', value: 5, quantity: 7, stackGroup: 'coins', id: '1' }),
                coin({ denomination: 'gp', quantity: 7, id: '2' }),
                coin({ denomination: 'sp', quantity: 6, id: '3' }),
                coin({ denomination: 'cp', quantity: 6, id: '4', containerId: 'yo' }),
            ] as TreasureData[],
        } as ActorDataPF2e);
        await addCoins(actor, {
            coins: {
                pp: 3,
                gp: 6,
                sp: 0,
                cp: 4,
            },
            combineStacks: true,
        });

        const items = actor.data.items!.map((x: TreasureData) => x) as TreasureData[];
        expect(items[1].data.quantity.value).toBe(13);
        expect(items[4].data.denomination.value).toBe('pp');
        expect(items[4].data.quantity.value).toBe(3);
        expect(items[5].data.denomination.value).toBe('cp');
        expect(items[5].data.quantity.value).toBe(4);
    });

    test('sell ignores coins', async () => {
        const actor: any = new FakeActor({
            items: [
                treasure({ id: 'abcdef', denomination: 'gp', value: 5, quantity: 7, stackGroup: 'coins' }),
            ] as TreasureData[],
        } as ActorDataPF2e);
        await sellAllTreasure(actor);

        expect(actor.data.items!.length).toBe(1);
        expect(actor.data.items![0]._id).toBe('abcdef');
    });

    test('sell without coins has the same value as calculateWealth', async () => {
        const actor = (new FakeActor({
            items: [
                ({
                    _id: 'ignore',
                    type: 'equipment',
                    data: {
                        denomination: {
                            value: 'gp',
                        },
                        quantity: {
                            value: 1,
                        },
                        value: {
                            value: 1,
                        },
                    },
                } as unknown) as EquipmentData,
                treasure({ denomination: 'pp', value: 1, quantity: 10 }),
                treasure({ denomination: 'gp', value: 1, quantity: 9 }),
                treasure({ denomination: 'sp', value: 1, quantity: 8 }),
                treasure({ denomination: 'cp', value: 1, quantity: 7 }),
            ],
        } as ActorDataPF2e) as unknown) as ActorPF2e;

        await sellAllTreasure(actor);
        const wealth = calculateValueOfCurrency(actor.data.items);

        expect(wealth).toEqual({
            pp: 10,
            gp: 9,
            sp: 8,
            cp: 7,
        });
    });

    test('sell only finds treasure', async () => {
        const actor: any = new FakeActor({
            items: [
                treasure({ denomination: 'pp', value: 1, quantity: 10, stackGroup: '', id: 'treasure 1' }),
                treasure({ denomination: 'gp', value: 1, quantity: 9, stackGroup: '', id: 'treasure 2' }),
                {
                    type: 'weapon',
                    _id: 'weapon',
                    data: {},
                } as WeaponData,
                {
                    type: 'armor',
                    _id: 'armor',
                    data: {},
                } as ArmorData,
            ],
        } as ActorDataPF2e);

        await sellAllTreasure(actor);
        expect(actor.data.items.map((x: ItemDataPF2e) => x._id)).toEqual(['weapon', 'armor', 'item1', 'item2']);
    });

    test('calculateTotalWealth correctly combines all item types', () => {
        const items = ([
            {
                type: 'weapon',
                _id: 'weapon',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '3,000 gp' } },
            },
            {
                type: 'armor',
                _id: 'armor',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '30 pp' } },
            },
            {
                type: 'equipment',
                _id: 'equipment',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '3 cp' } },
            },
            {
                type: 'consumable',
                _id: 'consumable',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '30 sp' } },
            },
            {
                type: 'treasure',
                _id: 'treasure',
                data: { denomination: { value: 'sp' }, quantity: { value: 2 }, value: { value: 2 } },
            },
            {
                type: 'backpack',
                _id: 'backpack',
                data: { quantity: { value: 1 }, price: { denomination: 'gp', value: '3 gp' } },
            },
        ] as unknown[]) as PhysicalItemData[];
        const wealth = calculateTotalWealth(items);
        expect(wealth).toEqual({ pp: 30, gp: 3003, sp: 34, cp: 3 });
    });

    test('attemptToRemoveCoinsByValue resolves to false if not enough coins are available and makes no changes', async () => {
        const actor: any = {
            data: {
                items: [
                    coin({ id: '1', denomination: 'gp', quantity: 7 }),
                    coin({ id: '2', denomination: 'gp', quantity: 9 }),
                ],
            },
            get items() {
                return this.data.items.map((itemData: any) => new FakeItem(itemData));
            },
            get itemTypes() {
                return {
                    treasure: this.items,
                };
            },
        };
        expect(await attemptToRemoveCoinsByValue({ actor, coinsToRemove: { pp: 0, gp: 18, sp: 0, cp: 0 } })).toEqual(
            false,
        );
        expect(calculateValueOfCurrency(actor.data.items)).toEqual({ pp: 0, gp: 16, sp: 0, cp: 0 });
    });

    test('attemptToRemoveCoinsByValue resolves to true if sufficient coins are available after updating coin counts', async () => {
        const actor: any = new FakeActor({
            items: [
                coin({ id: '1', denomination: 'gp', quantity: 7 }),
                coin({ id: '2', denomination: 'gp', quantity: 9 }),
                coin({ id: '3', denomination: 'pp', quantity: 9 }),
            ],
        } as ActorDataPF2e);
        expect(await attemptToRemoveCoinsByValue({ actor, coinsToRemove: { pp: 0, gp: 98, sp: 0, cp: 0 } })).toEqual(
            true,
        );
        if (actor.data.items === undefined) {
            throw Error('messed up');
        }
        expect(actor.data.items.length).toEqual(1);
        expect((actor.data.items[0] as TreasureData).data.quantity.value).toEqual(8);
        expect((actor.data.items[0] as TreasureData).data.denomination.value).toEqual('gp');
    });

    test('attemptToRemoveCoinsByValue breaks coins when needed', async () => {
        const actor: any = new FakeActor({
            items: [coin({ id: '3', denomination: 'pp', quantity: 9 })],
        } as ActorDataPF2e);
        const result = await attemptToRemoveCoinsByValue({ actor, coinsToRemove: { pp: 1, gp: 3, sp: 2, cp: 1 } });
        expect(result).toEqual(true);
        if (actor.data.items === undefined) {
            throw Error('messed up');
        }

        //  9 0 0 0 =
        //  8 9 9 10
        // -1 3 2 1
        // --------
        //  7 6 7 9

        const simpleItems = actor.data.items.map((x: TreasureData) => ({
            quantity: x.data.quantity.value,
            denomination: x.data.denomination.value,
        }));
        expect(simpleItems).toEqual([
            { quantity: 7, denomination: 'pp' },
            { quantity: 6, denomination: 'gp' },
            { quantity: 7, denomination: 'sp' },
            { quantity: 9, denomination: 'cp' },
        ]);
    });
});
