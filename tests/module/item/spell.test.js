import Spell from 'module/item/spell.js';

const characterData = require('tests/fixtures/characterData.json');
const electricArc = require('tests/fixtures/spells/electric_arc.json');
const shatteringGem = require('tests/fixtures/spells/shattering_gem.json');
const spellcastingEntry = require('tests/fixtures/items/spellcastingEntry.json');

const spellcastingEntryItem = {
  data: spellcastingEntry,
};
const actor = {
  getOwnedItem: jest.fn().mockImplementation(() => spellcastingEntryItem),
  data: characterData,
};

describe('#spellcastingEntry', () => {
  test('returns the spellcasting entry it comes from', () => {
    const spell = new Spell(electricArc, { castingActor: actor });

    expect(spell.spellcastingEntryId).toBe(147);
    expect(spell.spellcastingEntry.ability).toBe('int');
  });
});

describe('#damageParts', () => {
  test('returns all the parts to give to a damage roll', () => {
    const spell = new Spell(electricArc, { castingActor: actor });

    expect(spell.damageParts).toEqual(['1d4', 3]);
  });

  test('heightens +1 if given a spell level with a 1st level spell', () => {
    const spell = new Spell(shatteringGem, { castingActor: actor, castLevel: 3 });

    expect(spell.damageParts).toEqual(['1d8', '1d8', '1d8']);
  });
  test('automatically heightens cantrips to caster max level', () => {
    characterData.data.details.level.value = 5;
    const spell = new Spell(electricArc, { castingActor: actor, castLevel: 3 });

    expect(spell.damageParts).toEqual(['1d4', 3, '1d4', '1d4']);
  });
});
