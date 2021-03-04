import {
    calculateDamage,
    DamageType,
    DamageValues,
    Immunity,
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
});
