import {
    calculateDamage,
    DamageType,
    DamageValues,
    golemAntiMagic,
    GolemMagicImmunity,
    Immunity,
    parseExceptions,
    reduceResistances,
    Resistance,
    Weakness,
} from '../../src/module/damage-calculation';

describe('test damage calculation', () => {
    test('simple damage', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 3, precision: 2 }));
        expect(
            calculateDamage({
                damage,
            }),
        ).toBe(5);
    });

    test('precision resistance', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 3, precision: 2, critical: 3, criticalPrecision: 2 }));
        expect(
            calculateDamage({
                damage,
                resistances: [new Resistance({ type: 'precision', value: 3 })],
            }),
        ).toBe(7);
    });

    test('precision resistance not taken because piercing resistance reduces more', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 3, precision: 2, critical: 3, criticalPrecision: 2 }));
        expect(
            calculateDamage({
                damage,
                resistances: [
                    new Resistance({ type: 'precision', value: 6 }),
                    new Resistance({ type: 'piercing', value: 5 }),
                ],
            }),
        ).toBe(5);
    });

    test('double resistance against non magical', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 4, precision: 2, critical: 3, criticalPrecision: 2 }));
        expect(
            calculateDamage({
                damage,
                resistances: [
                    new Resistance({
                        type: 'precision',
                        value: 6,
                    }),
                    new Resistance({
                        type: 'piercing',
                        value: 5,
                        doubleResistanceVsNonMagical: true,
                    }),
                ],
            }),
        ).toBe(1);
    });

    test('double resistance against non magical not triggered if magical', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set(
            'piercing',
            new DamageValues({
                normal: 4,
                precision: 2,
                critical: 3,
                criticalPrecision: 2,
                traits: new Set(['magical']),
            }),
        );
        expect(
            calculateDamage({
                damage,
                resistances: [
                    new Resistance({
                        type: 'precision',
                        value: 6,
                    }),
                    new Resistance({
                        type: 'piercing',
                        value: 5,
                        doubleResistanceVsNonMagical: true,
                    }),
                ],
            }),
        ).toBe(6);
    });

    test('exceptions do not apply resistance', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 3, precision: 2, critical: 3, criticalPrecision: 2 }));
        expect(
            calculateDamage({
                damage,
                resistances: [
                    new Resistance({
                        type: 'precision',
                        value: 6,
                        exceptions: [new Set(['adamantine'])],
                    }),
                    new Resistance({
                        type: 'piercing',
                        value: 5,
                        exceptions: [new Set(['physical'])],
                    }),
                ],
            }),
        ).toBe(6); // chosen resistance is precision which only reduces 4 however
    });

    test('weakness not triggered because all damage is reduced', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 0, precision: 2, critical: 0, criticalPrecision: 2 }));
        expect(
            calculateDamage({
                damage,
                immunities: [new Immunity({ type: 'precision' })],
                weaknesses: [new Weakness({ value: 5, type: 'piercing' })],
            }),
        ).toBe(0);
    });

    test('precision spills over into piercing', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 0, precision: 2, critical: 0, criticalPrecision: 2 }));
        expect(
            calculateDamage({
                damage,
                weaknesses: [new Weakness({ value: 5, type: 'piercing' })],
            }),
        ).toBe(9);
    });

    test('resistance to critical hits triggers per damage pool', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ critical: 3 }));
        damage.set('fire', new DamageValues({ critical: 6 }));
        expect(
            calculateDamage({
                damage,
                resistances: [new Resistance({ value: 5, type: 'critical-hits' })],
            }),
        ).toBe(1);
    });

    test('weakness to critical hits triggers per damage pool', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ critical: 3 }));
        damage.set('fire', new DamageValues({ critical: 6 }));
        expect(
            calculateDamage({
                damage,
                weaknesses: [new Weakness({ value: 5, type: 'critical-hits' })],
            }),
        ).toBe(19);
    });

    test('resistance to critical hits does not triggers if no critical hit damage is present', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 0, precision: 2 }));
        damage.set('fire', new DamageValues({ normal: 0, precision: 3 }));
        expect(
            calculateDamage({
                damage,
                resistances: [new Resistance({ value: 5, type: 'critical-hits' })],
            }),
        ).toBe(5);
    });

    test('immune to non lethal has to be set on all damage types', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 2, traits: new Set(['nonlethal attacks']) }));
        damage.set('fire', new DamageValues({ normal: 2, traits: new Set(['nonlethal attacks']) }));
        damage.set('cold', new DamageValues({ normal: 3 }));
        expect(
            calculateDamage({
                damage,
                immunities: [new Immunity({ type: 'nonlethal attacks' })],
            }),
        ).toBe(3);
    });

    test('alignment damage', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('evil', new DamageValues({ normal: 1 }));
        damage.set('good', new DamageValues({ normal: 2 }));
        damage.set('chaotic', new DamageValues({ normal: 4 }));
        damage.set('lawful', new DamageValues({ normal: 8 }));
        expect(
            calculateDamage({
                damage,
                alignment: 'CE',
            }),
        ).toBe(10);
    });

    test('positive damage on living creatures', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('positive', new DamageValues({ normal: 1 }));
        damage.set('negative', new DamageValues({ normal: 2 }));
        expect(
            calculateDamage({
                damage,
                living: 'living',
            }),
        ).toBe(2);
    });

    test('positive damage on undead creatures', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('positive', new DamageValues({ normal: 1 }));
        damage.set('negative', new DamageValues({ normal: 2 }));
        expect(
            calculateDamage({
                damage,
                living: 'undead',
            }),
        ).toBe(1);
    });

    test('positive damage on constructs', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('positive', new DamageValues({ normal: 1 }));
        damage.set('negative', new DamageValues({ normal: 2 }));
        expect(
            calculateDamage({
                damage,
                living: 'neither',
            }),
        ).toBe(0);
    });

    test('resistance to physical damage, vulnerable to bleed', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('bleed', new DamageValues({ normal: 8 }));
        damage.set('piercing', new DamageValues({ normal: 5 }));
        expect(
            calculateDamage({
                damage,
                weaknesses: [new Weakness({ type: 'bleed', value: 4 })],
                resistances: [new Resistance({ type: 'physical', value: 3 })],
            }),
        ).toBe(11);
    });

    test('resistance to all damage', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('bleed', new DamageValues({ normal: 8 }));
        damage.set('piercing', new DamageValues({ normal: 5 }));
        expect(
            calculateDamage({
                damage,
                resistances: [new Resistance({ type: 'all', value: 3 })],
            }),
        ).toBe(7);
    });

    test('immune to critical hits', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set(
            'bleed',
            new DamageValues({ normal: 1, critical: 2, criticalPrecision: 4, precision: 8, splash: 16 }),
        );
        expect(
            calculateDamage({
                damage,
                immunities: [new Immunity({ type: 'critical-hits' })],
            }),
        ).toBe(25);
    });

    test('object immunities', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('bleed', new DamageValues({ normal: 1 }));
        damage.set('poison', new DamageValues({ normal: 2 }));
        damage.set('piercing', new DamageValues({ normal: 4, traits: new Set(['nonlethal attacks']) }));
        damage.set('mental', new DamageValues({ normal: 8 }));
        damage.set('piercing', new DamageValues({ normal: 16 }));
        expect(
            calculateDamage({
                damage,
                immunities: [new Immunity({ type: 'object-immunities' })],
            }),
        ).toBe(16);
    });

    test('one damage exception covers all, except when they are removed by immunities', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set(
            'bleed',
            new DamageValues({
                normal: 64,
            }),
        );
        damage.set(
            'slashing',
            new DamageValues({
                normal: 1,
                traits: new Set(['vorpal']),
            }),
        );
        expect(
            calculateDamage({
                damage,
                immunities: [new Immunity({ type: 'object-immunities' })],
                weaknesses: [
                    // does not trigger because bleed damage is removed by immunity
                    new Weakness({ type: 'bleed', value: 32, exceptions: [new Set(['physical'])] }),
                    // does not trigger because physical damage exception
                    new Weakness({ type: 'slashing', value: 128, exceptions: [new Set(['physical'])] }),
                    new Weakness({ type: 'slashing', value: 8 }),
                ],
                resistances: [
                    new Resistance({
                        type: 'all',
                        value: 2,
                        exceptions: [new Set(['piercing', 'vorpal'])],
                    }),
                    // does not trigger because the exception removes it although the value is higher
                    new Resistance({
                        type: 'all',
                        value: 8,
                        exceptions: [new Set(['vorpal'])],
                    }),
                    // does not trigger because the exception removes it although the value is higher
                    new Resistance({
                        type: 'all',
                        value: 4,
                        exceptions: [new Set(['piercing', 'physical']), new Set(['vorpal', 'slashing'])],
                    }),
                ],
            }),
        ).toBe(7);
    });
});

describe('test golem anti magic', () => {
    const immunity: GolemMagicImmunity = {
        harmedBy: {
            areaOrPersistentFormula: '2d4',
            formula: '3d4',
            type: new Set(['earth', 'force']),
        },
        healedBy: {
            formula: '4d4',
            type: new Set(['fire']),
        },
        slowedBy: new Set(['cold']),
    };

    test('no triggering damage type', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('bleed', new DamageValues({ normal: 3 }));
        const result = golemAntiMagic(damage, immunity);
        expect(result.getHealedFormula()).toBeUndefined();
        expect(result.getHarmedFormula()).toBeUndefined();
        expect(result.getSlowedRoundsFormula()).toBeUndefined();
    });

    test('damaged by earth', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('bleed', new DamageValues({ normal: 3, traits: new Set(['earth']) }));
        const result = golemAntiMagic(damage, immunity);
        expect(result.getHealedFormula()).toBeUndefined();
        expect(result.getHarmedFormula()).toBe('3d4');
        expect(result.getSlowedRoundsFormula()).toBeUndefined();
    });

    test('damaged by force area damage', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('force', new DamageValues({ normal: 3, traits: new Set(['area-damage']) }));
        const result = golemAntiMagic(damage, immunity);
        expect(result.getHealedFormula()).toBeUndefined();
        expect(result.getHarmedFormula()).toBe('2d4');
        expect(result.getSlowedRoundsFormula()).toBeUndefined();
    });

    test('healed by fire damage', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('fire', new DamageValues({ normal: 3 }));
        const result = golemAntiMagic(damage, immunity);
        expect(result.getHealedFormula()).toBe('4d4');
        expect(result.getHarmedFormula()).toBeUndefined();
        expect(result.getSlowedRoundsFormula()).toBeUndefined();
    });

    test('slowed by cold damage', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('cold', new DamageValues({ normal: 3 }));
        const result = golemAntiMagic(damage, immunity);
        expect(result.getHealedFormula()).toBeUndefined();
        expect(result.getHarmedFormula()).toBeUndefined();
        expect(result.getSlowedRoundsFormula()).toBe('2d6');
    });

    test('trigger all types', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('cold', new DamageValues({ normal: 3 }));
        damage.set('fire', new DamageValues({ normal: 3 }));
        damage.set('force', new DamageValues({ normal: 3 }));
        const result = golemAntiMagic(damage, immunity);
        expect(result.getHealedFormula()).toBe('4d4');
        expect(result.getHarmedFormula()).toBe('3d4');
        expect(result.getSlowedRoundsFormula()).toBe('2d6');
    });
});

describe('Test Parsing Exceptions', () => {
    /**
     * This method needs to deal with the following string value crap:
     * * physical 10 (except magical silver)
     * * physical 24 (except bludgeoning adamantine)
     * * physical 15 (except magic bludgeoning)
     * * physical 20 (except vorpal adamantine)
     * * all 5 (except force, ghost touch, or negative; double resistance vs. non-magical)
     * * physical 12 (except adamantine or bludgeoning)
     * * physical 15 (except cold iron)
     * * physical 5 (except magical)
     * * all 15 (except unarmed attacks)
     * * all 15 (except non-magical)
     * * all 5 (except force or ghost touch)
     * @param exceptions
     */
    const testCases = [
        {
            exception: 'except magical silver',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['magical', 'silver'])],
            },
        },
        {
            exception: 'except bludgeoning adamantine',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['bludgeoning', 'adamantine'])],
            },
        },
        {
            exception: 'except magical bludgeoning',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['magical', 'bludgeoning'])],
            },
        },
        {
            exception: 'except force, ghost touch, or positive; double resistance vs. non-magical',
            expected: {
                doubleResistanceVsNonMagical: true,
                except: [new Set(['force']), new Set(['ghostTouch']), new Set(['positive'])],
            },
        },
        {
            exception: 'except vorpal adamantine',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['vorpal', 'adamantine'])],
            },
        },
        {
            exception: 'except adamantine or bludgeoning',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['adamantine']), new Set(['bludgeoning'])],
            },
        },
        {
            exception: 'except cold iron',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['coldiron'])],
            },
        },
        {
            exception: 'except magical',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['magical'])],
            },
        },
        {
            exception: 'except unarmed attacks',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['unarmed'])],
            },
        },
        {
            exception: 'except non-magical',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['non-magical'])],
            },
        },
        {
            exception: 'except force or ghost touch',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [new Set(['force']), new Set(['ghostTouch'])],
            },
        },
        {
            exception: 'except tomato or patate',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [],
            },
        },
        {
            exception: '',
            expected: {
                doubleResistanceVsNonMagical: false,
                except: [],
            },
        },
    ];

    testCases.forEach((testCase) => {
        test(`test ${testCase.exception}`, () => {
            expect(parseExceptions(testCase.exception)).toEqual(testCase.expected);
        });
    });
});

describe('Reduce Resistances', () => {
    const reductions = new Map();
    reductions.set('fire', 11);
    reductions.set('cold', 5);

    test(`reduce values`, () => {
        const result = reduceResistances(
            [new Resistance({ type: 'fire', value: 10 }), new Resistance({ type: 'cold', value: 11 })],
            reductions,
        );
        expect(result[0].getValue()).toEqual(0);
        expect(result[1].getValue()).toEqual(6);
    });
});
