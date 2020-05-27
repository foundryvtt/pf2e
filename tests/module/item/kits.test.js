import { addKit } from '../../../src/module/item/kits.js';

describe('testing kits', () => {
    test('should add an adventurer\'s pack', async () => {
        const mockFn = jest.fn(async (itemId, containerId, quantity) => itemId);
        
        await addKit('rxXT8KPBXa08feFD', mockFn);
        
        const {mock} = mockFn;
        expect(mock.calls.length)
            .toBe(11);
        expect(mock.calls[0])
            .toEqual(['3lgwjrFEsQVKzhh7', undefined, undefined]);
        expect(mock.calls[1])
            .toEqual(['fagzYdmfYyMQ6J77', '3lgwjrFEsQVKzhh7', undefined]);
        expect(mock.calls[2])
            .toEqual(['xShIDyydOMkGvGNb', '3lgwjrFEsQVKzhh7', 10]);
        expect(mock.calls[3])
            .toEqual(['UlIxxLm71UdRgCFE', '3lgwjrFEsQVKzhh7', undefined]);
        expect(mock.calls[4])
            .toEqual(['fyYnQf1NAx9fWFaS', '3lgwjrFEsQVKzhh7', undefined]);
        expect(mock.calls[5])
            .toEqual(['L9ZV076913otGtiB', '3lgwjrFEsQVKzhh7', 14]);
        expect(mock.calls[6])
            .toEqual(['81aHsD27HFGnq1Nt', '3lgwjrFEsQVKzhh7', undefined]);
        expect(mock.calls[7])
            .toEqual(['8Jdw4yAzWYylGePS', '3lgwjrFEsQVKzhh7', 5]);
        expect(mock.calls[8])
            .toEqual(['VnPh324pKwd2ZB66', '3lgwjrFEsQVKzhh7', undefined]);
        expect(mock.calls[9])
            .toEqual(['eFqKVKrf62XOGWUw', undefined, undefined]);
        expect(mock.calls[10])
            .toEqual(['eFqKVKrf62XOGWUw', undefined, undefined]);
    });
});