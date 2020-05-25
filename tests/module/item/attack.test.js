import { calculateWeaponDamageDice } from '../../../src/module/item/attack.js';

function createItemData({
    dice = 1,
    die = 'd4',
    damageType = 'slashing',
    striking = '',
    potency = '',
    twoHanded = '',
    traits = [],
    preciousMaterial = ''
}) {
    return {
        data: {
            damage: {
                value: '',
                dice,
                die,
                damageType
            },
            strikingRune: {
                value: striking
            },
            potencyRune: {
                value: potency
            },
            hands: {
                value: twoHanded
            },
            traits: {
                value: traits
            },
            preciousMaterial: {
                value: preciousMaterial
            }
        }
    };
}

describe('should damage dice', () => {
    test('striking magical weapon', () => {
        const dice = calculateWeaponDamageDice(createItemData({
            dice: 2,
            striking: 'greaterStriking',
            potency: '1'
        }));

        expect(dice.length)
            .toBe(1);
        expect(dice[0].die)
            .toBe('d4');
        expect(dice[0].rolls)
            .toBe(4);
        expect(dice[0].damageTypes)
            .toEqual(['slashing', 'magical']);
    });

    test('striking two handed weapon', () => {
        const dice = calculateWeaponDamageDice(createItemData({
            striking: 'striking',
            twoHanded: 'y',
            traits: ['two-hand-d8'],
            preciousMaterial: 'adamantine'
        }));

        expect(dice.length)
            .toBe(1);
        expect(dice[0].die)
            .toBe('d8');
        expect(dice[0].rolls)
            .toBe(2);
        expect(dice[0].damageTypes)
            .toEqual(['slashing', 'magical']);
    });

    test('silver damage', () => {
        const dice = calculateWeaponDamageDice(createItemData({
            preciousMaterial: 'silver'
        }));

        expect(dice.length)
            .toBe(1);
        expect(dice[0].die)
            .toBe('d4');
        expect(dice[0].rolls)
            .toBe(1);
        expect(dice[0].damageTypes)
            .toEqual(['slashing', 'silver']);
    });

    test('cold iron damage', () => {
        const dice = calculateWeaponDamageDice(createItemData({
            preciousMaterial: 'coldIron'
        }));

        expect(dice.length)
            .toBe(1);
        expect(dice[0].die)
            .toBe('d4');
        expect(dice[0].rolls)
            .toBe(1);
        expect(dice[0].damageTypes)
            .toEqual(['slashing', 'coldIron']);
    });
});    
