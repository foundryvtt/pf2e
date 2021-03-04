import { calculateDamage, DamageType, DamageValues } from '../../src/module/damage-calculation';

describe('test damage calculation', () => {
    test('test simple damage', () => {
        const damage = new Map<DamageType, DamageValues>();
        damage.set('piercing', new DamageValues({ normal: 3, precision: 2 }));
        expect(
            calculateDamage({
                damage,
                resistances: [],
                immunities: [],
                weaknesses: [],
                alignment: 'N',
                living: 'living',
            }),
        ).toBe(5);
    });
});
