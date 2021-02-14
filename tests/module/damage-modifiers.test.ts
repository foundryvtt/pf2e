import { mergeImmunities, mergeResistancesOrWeaknesses } from '../../src/module/damage-modifiers';
import { LabeledValue } from '@actor/actorDataDefinitions';

function createLabeledValue(type: string, value: number, exceptions?: string): LabeledValue {
    return {
        exceptions,
        type,
        value,
        label: 'Label',
    };
}

describe('Test Damage Modifiers', () => {
    test('should merge immunities', () => {
        const result = mergeImmunities({ value: ['fire', 'cold'], custom: 'cold' }, ['cold', 'electricity']);
        expect(result).toEqual(['fire', 'cold', 'electricity']);
    });

    test('should merge resistances and weaknesses', () => {
        const values: LabeledValue[] = [
            createLabeledValue('cold', 5),
            createLabeledValue('cold', 15),
            createLabeledValue('cold', 5, 'silver'),
            createLabeledValue('fire', 3),
        ];
        const result = mergeResistancesOrWeaknesses(values);
        expect(result).toEqual([
            createLabeledValue('cold', 15),
            createLabeledValue('cold', 5, 'silver'),
            createLabeledValue('fire', 3),
        ]);
    });
});
