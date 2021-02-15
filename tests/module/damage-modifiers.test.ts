import { mergeImmunities, mergeResistancesOrWeaknesses, parseExceptions } from '../../src/module/damage-modifiers';
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
    ];

    testCases.forEach((testCase) => {
        test(`test ${testCase.exception}`, () => {
            expect(parseExceptions(testCase.exception)).toEqual(testCase.expected);
        });
    });
});
