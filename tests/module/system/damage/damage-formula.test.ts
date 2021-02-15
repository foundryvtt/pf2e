import { DamageFormula } from '../../../../src/module/system/damage/damage-formula';
import { DamageEntry } from '../../../../src/module/system/damage/damage-entry';

describe('#toString', () => {
    let entries;

    function toString() {
        return new DamageFormula(entries).toString();
    }

    function entry(data) {
        data = Object.assign({ damageType: 'slashing' }, data);
        entries.push(new DamageEntry(data));
    }

    beforeEach(() => {
        entries = [];
    });

    it('returns dice + modifier', () => {
        entry({ dieSize: 'd6', diceNumber: 2, modifier: 3 });
        expect(toString()).toEqual('2d6 + 3');
    });

    it('merges modifiers from different entries', () => {
        entry({ modifier: 3 });
        entry({ modifier: 4 });
        expect(toString()).toEqual('7');
    });

    it('merges dice from different entries', () => {
        entry({ dieSize: 'd6', diceNumber: 2 });
        entry({ dieSize: 'd6', diceNumber: 3 });
        entry({ dieSize: 'd4', diceNumber: 1 });
        expect(toString()).toEqual('5d6 + 1d4');
    });

    it('adds diceNumber to modifier if dieSize is missing', () => {
        entry({ diceNumber: 2 });
        entry({ diceNumber: 3 });
        expect(toString()).toEqual('5');
    });

    it('returns empty string when multiplier is 0', () => {
        entry({ dieSize: 'd6', diceNumber: 2, multiplier: 0 });
        expect(toString()).toEqual('');
    });

    it('returns double formula if multiplier is 2', () => {
        entry({ dieSize: 'd6', diceNumber: 2, multiplier: 2 });
        entry({ dieSize: 'd4', diceNumber: 1, multiplier: 2 });
        expect(toString()).toEqual('2 * (2d6 + 1d4)');
    });

    it('returns double formula if multiplier is 2', () => {
        entry({ dieSize: 'd6', diceNumber: 2, multiplier: 0.5 });
        expect(toString()).toEqual('0.5 * (2d6)');
    });

    it('returns formula with multiple multipliers', () => {
        entry({ dieSize: 'd6', diceNumber: 2, multiplier: 2 });
        entry({ dieSize: 'd4', diceNumber: 1, multiplier: 1 });
        expect(toString()).toEqual('2 * (2d6) + 1d4');
    });
});
