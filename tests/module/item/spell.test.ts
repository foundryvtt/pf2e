import { ActorPF2e } from '@actor/base';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import { fetchSpell } from 'tests/setup';
import { SpellFacade } from '@item/spell-facade';

import * as characterData from 'tests/fixtures/characterData.json';
import * as spellcastingEntry from 'tests/fixtures/items/spellcastingEntry.json';

const electricArc = fetchSpell('Electric Arc');
const shatteringGem = fetchSpell('Shattering Gem');
const tempestSurge = fetchSpell('Template Surge');
const daze = fetchSpell('Daze');
const spiritualWeapon = fetchSpell('Spiritual Weapon');
const forceBolt = fetchSpell('forceBolt');
const litanyAgainstWrath = fetchSpell('litanyAgainstWrath');

const spellcastingEntryItem = {
    data: spellcastingEntry,
};
const actor = {
    getOwnedItem: jest.fn().mockImplementation(() => spellcastingEntryItem) as unknown as SpellcastingEntryPF2e,
    data: characterData,
    items: [],
    get level() {
        return characterData.data.details.level.value;
    },
    getAbilityMod: (_ability: string) => 3,
} as any as ActorPF2e;

describe('#spellcastingEntry', () => {
    test.skip('returns the spellcasting entry it comes from', () => {
        const spell = new SpellFacade(electricArc, { castingActor: actor });

        expect(spell.spellcastingEntryId).toBe(147);
        expect(spell.spellcastingEntry!.ability).toBe('int');
    });
});

describe('#damageParts', () => {
    test.skip('returns all the parts to give to a damage roll', () => {
        const spell = new SpellFacade(electricArc, { castingActor: actor });

        expect(spell.damageParts).toEqual(['1d4', 3]);
    });

    test.skip('heightens +1 if given a spell level with a 1st level spell', () => {
        const spell = new SpellFacade(shatteringGem, { castingActor: actor, castLevel: 3 });

        expect(spell.damageParts).toEqual(['1d8', '1d8', '1d8']);
    });
    test.skip('automatically heightens cantrips to caster max level', () => {
        characterData.data.details.level.value = 5;
        const spell = new SpellFacade(electricArc, { castingActor: actor, castLevel: 3 });

        expect(spell.damageParts).toEqual(['1d4', 3, '1d4', '1d4']);
    });
    test.skip('automatically heightens focus spells to caster max level', () => {
        characterData.data.details.level.value = 5;
        const spell = new SpellFacade(tempestSurge, { castingActor: actor, castLevel: 3 });

        expect(spell.damageParts).toEqual(['1d12', '1d12', '1d12']);
    });
    test.skip('automatically heightens focus spells not set to level 11', () => {
        characterData.data.details.level.value = 5;
        const spell = new SpellFacade(forceBolt, { castingActor: actor, castLevel: 1 });

        expect(spell.damageParts).toEqual(['1d4+1', '1d4+1']);
    });
    test.skip('automatically heightens focus spells with a level higher than 1', () => {
        characterData.data.details.level.value = 7;
        const spell = new SpellFacade(litanyAgainstWrath, { castingActor: actor });

        expect(spell.damageParts).toEqual(['3d6', '1d6']);
    });
    test.skip('heightens +2 for cantrips', () => {
        characterData.data.details.level.value = 5;
        const spell = new SpellFacade(daze, { castingActor: actor, castLevel: 3 });

        expect(spell.damageParts).toEqual([3, '1d6']);
    });
    test.skip('heightens +2 for higher-leveled spells', () => {
        let spell = new SpellFacade(spiritualWeapon, { castingActor: actor, castLevel: 3 });
        expect(spell.damageParts).toEqual(['1d8', 3]);

        spell = new SpellFacade(spiritualWeapon, { castingActor: actor, castLevel: 4 });
        expect(spell.damageParts).toEqual(['1d8', 3, '1d8']);

        spell = new SpellFacade(spiritualWeapon, { castingActor: actor, castLevel: 5 });
        expect(spell.damageParts).toEqual(['1d8', 3, '1d8']);

        spell = new SpellFacade(spiritualWeapon, { castingActor: actor, castLevel: 6 });
        expect(spell.damageParts).toEqual(['1d8', 3, '1d8', '1d8']);
    });
});
