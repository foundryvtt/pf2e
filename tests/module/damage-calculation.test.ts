import { calculateDamage, DamageType, DamageValues, Resistance } from '../../src/module/damage-calculation';

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
        ).toBe(6);
    });
});
