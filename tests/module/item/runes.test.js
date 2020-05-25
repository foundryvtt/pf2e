import { getPropertySlots } from '../../../src/module/item/runes';

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
}); 