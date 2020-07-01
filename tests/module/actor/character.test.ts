import CharacterData from '../../../src/module/actor/character';

const characterData = require('tests/fixtures/characterData.json');

describe('#level', () => {
  test('it returns the level in the data structure', () => {
    const character = new CharacterData(characterData.data);
    expect(character.level).toBe(1);
  });
});

describe('#maxExp', () => {
  test('it returns the maximum experience per level', () => {
    const character = new CharacterData(characterData.data);
    expect(character.maxExp).toBe(1000);
  });
});

describe('#exp', () => {
  test('it returns the current xp', () => {
    const character = new CharacterData(characterData.data);
    expect(character.exp).toBe(125);
  });
});

describe('#ac', () => {
  test('it returns the calculated armor AC when scale mail is equipped', () => {
    const scaleMail = require('tests/fixtures/armor/scaleMail.json');
    const inventory = [
      {
        data: scaleMail,
      },
    ];
    const character = new CharacterData(characterData.data, inventory);
    expect(character.ac).toBe(14);
  });
  test('it returns unarmored AC when no armor is equipped', () => {
    const inventory = [
    ];
    const character = new CharacterData(characterData.data, inventory);
    expect(character.ac).toBe(11);
  });
  test('works when a shield is also equipped', () => {
    const scaleMail = require('tests/fixtures/armor/scaleMail.json');
    const shield = require('tests/fixtures/armor/steelShield.json');
    const inventory = [
      { data: shield },
      { data: scaleMail },
    ];
    const character = new CharacterData(characterData.data, inventory);
    expect(character.ac).toBe(14);
  });
});
