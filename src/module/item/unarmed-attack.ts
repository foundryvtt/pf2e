import { WeaponData } from '@item/data-definitions';

export const unarmedAttackData: WeaponData = {
    name: 'Unarmed Attack',
    permission: {},
    type: 'weapon',
    data: {
        description: {
            value: '',
        },
        source: {
            value: '',
        },
        traits: {
            value: ['agile', 'finesse', 'nonlethal', 'unarmed'],
            rarity: {
                value: 'common',
            },
            custom: '',
        },
        rules: [],
        slug: 'unarmed-attack',
        quantity: {
            value: 1,
        },
        baseItem: 'fist',
        hp: {
            value: 0,
        },
        maxHp: {
            value: 0,
        },
        hardness: {
            value: 0,
        },
        brokenThreshold: {
            value: 0,
        },
        weight: {
            value: 0,
        },
        equippedBulk: {
            value: '',
        },
        unequippedBulk: {
            value: '',
        },
        price: {
            value: '0',
        },
        equipped: {
            value: true,
        },
        identified: {
            value: true,
        },
        stackGroup: {
            value: '',
        },
        bulkCapacity: {
            value: '',
        },
        negateBulk: {
            value: '0',
        },
        containerId: {
            value: '',
        },
        preciousMaterial: {
            value: '',
        },
        preciousMaterialGrade: {
            value: '',
        },
        collapsed: {
            value: false,
        },
        size: {
            value: 'med',
        },
        identification: {
            status: 'identified',
        },
        level: {
            value: 0,
        },
        invested: {
            value: false,
        },
        weaponType: {
            value: 'unarmed',
        },
        group: {
            value: 'brawling',
        },
        hands: {
            value: false,
        },
        bonus: {
            value: 0,
        },
        damage: {
            value: '',
            dice: 1,
            die: 'd4',
            damageType: 'bludgeoning',
            modifier: 0,
        },
        bonusDamage: {
            value: '',
        },
        splashDamage: {
            value: '',
        },
        range: {
            value: '',
        },
        reload: {
            value: '',
        },
        ability: {
            value: 'str',
        },
        MAP: {
            value: '',
        },
        potencyRune: {
            value: 0,
        },
        strikingRune: {
            value: '',
        },
        propertyRune1: {
            value: '',
        },
        propertyRune2: {
            value: '',
        },
        propertyRune3: {
            value: '',
        },
        propertyRune4: {
            value: '',
        },
        usage: {
            value: 'held-in-one-hand',
        },
        property1: {
            value: '',
            dice: 0,
            die: '',
            damageType: '',
            critDice: 0,
            critDie: '',
            critDamage: '',
            critDamageType: '',
        },
        originalName: '',
    },
    sort: 3400000,
    flags: {},
    img: 'systems/pf2e/icons/equipment/weapons/fist.webp',
    effects: [],
    _id: 'unarmed-attack',
};
