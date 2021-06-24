import { getPropertyRunes, getPropertySlots, getAttackBonus, getArmorBonus } from '@item/runes';
import type { ArmorData, WeaponData } from '@item/data';

describe('test runes', () => {
    if (game.settings.get('pf2e', 'automaticBonusVariant') === 'noABP') {
        test('should get rune property slots', () => {
            expect(
                getPropertySlots({
                    _id: 'ignore',
                    type: 'ignore',
                    data: {
                        preciousMaterial: {
                            value: '',
                        },
                        potencyRune: {
                            value: 0,
                        },
                    },
                } as unknown as WeaponData),
            ).toBe(0);

            expect(
                getPropertySlots({
                    _id: 'ignore',
                    type: 'ignore',
                    data: {
                        preciousMaterial: {
                            value: '',
                        },
                        potencyRune: {
                            value: 2,
                        },
                    },
                } as unknown as WeaponData),
            ).toBe(2);

            expect(
                getPropertySlots({
                    _id: 'ignore',
                    type: 'ignore',
                    data: {
                        preciousMaterial: {
                            value: 'orichalcum',
                        },
                        potencyRune: {
                            value: 0,
                        },
                    },
                } as unknown as WeaponData),
            ).toBe(1);

            expect(
                getPropertySlots({
                    _id: 'ignore',
                    type: 'ignore',
                    data: {
                        preciousMaterial: {
                            value: 'orichalcum',
                        },
                        potencyRune: {
                            value: 3,
                        },
                    },
                } as unknown as WeaponData),
            ).toBe(4);
        });
    }
    test('should get property runes', () => {
        expect(
            getPropertyRunes(
                {
                    _id: 'ignore',
                    type: 'ignore',
                    data: {},
                } as unknown as WeaponData,
                3,
            ).length,
        ).toBe(0);

        const item = {
            _id: 'ignore',
            type: 'ignore',
            data: {
                preciousMaterial: {
                    value: '',
                },
                propertyRune1: {
                    value: 'a',
                },
                propertyRune2: {
                    value: 'b',
                },
                propertyRune3: {
                    value: 'c',
                },
                propertyRune4: {
                    value: 'd',
                },
            },
        } as unknown as WeaponData;

        expect(getPropertyRunes(item, 0)).toEqual([]);

        expect(getPropertyRunes(item, 1)).toEqual(['a']);

        expect(getPropertyRunes(item, 3)).toEqual(['a', 'b', 'c']);
    });

    test('bonus attack from potency runes', () => {
        const itemData = {
            potencyRune: {
                value: 3,
            },
            bonus: {
                value: 0,
            },
        } as unknown as WeaponData['data'];

        expect(getAttackBonus(itemData)).toBe(3);
    });

    test('bonus attack from bombs', () => {
        const itemData = {
            potencyRune: {
                value: 3,
            },
            bonus: {
                value: 2,
            },
            group: {
                value: 'bomb',
            },
        } as unknown as WeaponData['data'];

        expect(getAttackBonus(itemData)).toBe(2);
    });

    test('no bonus attack', () => {
        const itemData = {
            potencyRune: {
                value: 0,
            },
            bonus: {
                value: 0,
            },
        } as unknown as WeaponData['data'];

        expect(getAttackBonus(itemData)).toBe(0);
    });

    test('no bonus armor', () => {
        const itemData = {
            potencyRune: {
                value: 0,
            },
            armor: {
                value: 0,
            },
        } as unknown as ArmorData['data'];

        expect(getArmorBonus(itemData)).toBe(0);
    });

    test('no potency rune', () => {
        const itemData = {
            potencyRune: {
                value: 0,
            },
            armor: {
                value: 2,
            },
        } as unknown as ArmorData['data'];

        expect(getArmorBonus(itemData)).toBe(2);
    });

    test('potency rune', () => {
        const itemData = {
            potencyRune: {
                value: 1,
            },
            armor: {
                value: 0,
            },
        } as unknown as ArmorData['data'];

        expect(getArmorBonus(itemData)).toBe(1);
    });

    test('armor and potency rune', () => {
        const itemData = {
            potencyRune: {
                value: 1,
            },
            armor: {
                value: 2,
            },
        } as ArmorData['data'];

        expect(getArmorBonus(itemData)).toBe(3);
    });
});
