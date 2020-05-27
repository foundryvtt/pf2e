import { getPropertyRunes, getPropertySlots } from '../../../src/module/item/runes.js';

describe('test runes', () => {
    test('should get rune property slots', () => {
        expect(getPropertySlots({
            data: {
                preciousMaterial: {
                    value: '',
                },
                potencyRune: {
                    value: ''
                }
            }
        }))
            .toBe(0);

        expect(getPropertySlots({
            data: {
                preciousMaterial: {
                    value: '',
                },
                potencyRune: {
                    value: '2'
                }
            }
        }))
            .toBe(2);

        expect(getPropertySlots({
            data: {
                preciousMaterial: {
                    value: 'orichalcum',
                },
                potencyRune: {
                    value: ''
                }
            }
        }))
            .toBe(1);

        expect(getPropertySlots({
            data: {
                preciousMaterial: {
                    value: 'orichalcum',
                },
                potencyRune: {
                    value: '3'
                }
            }
        }))
            .toBe(4);
    });


    test('should get property runes', () => {
        expect(getPropertyRunes({
            data: {}
        }, 3).length)
            .toBe(0);
        
        const item = {
            data: {
                preciousMaterial: {
                    value: '',
                },
                propertyRune1: {
                    value: 'a'
                },
                propertyRune2: {
                    value: 'b'
                },
                propertyRune3: {
                    value: 'c'
                },
                propertyRune4: {
                    value: 'd'
                }
            }
        }
        
        expect(getPropertyRunes(item, 0))
            .toEqual([]);

        expect(getPropertyRunes(item, 1))
            .toEqual(['a']);

        expect(getPropertyRunes(item, 3))
            .toEqual(['a', 'b', 'c']);
    });
}); 