import { getArmorBonus } from '../item/runes.js';

class Armor {
  static unarmored() {
    return new Armor({
      data: {
        armorType: {
          value: 'unarmored',
        },
        armor: {
          value: '0',
        },
        dex: {
          value: '100',
        },
        strength: {
          value: '0',
        },
        check: {
          value: '0',
        },
      },
    });
  }

  static get armorTypes() {
    return [
      'light',
      'medium',
      'heavy',
      'unarmored',
    ];
  }

  static isArmor(item) {
    return item.type === 'armor' && item.data.equipped.value && Armor.armorTypes.includes(item.data.armorType.value);
  }

  constructor(data) {
    this.data = data.data;
  }

  get maxDex() {
    return this.data.dex.value;
  }

  get strengthRequirement() {
    return parseInt(this.data.strength.value, 10);
  }

  get checkPenalty() {
    return parseInt(this.data.check.value, 10);
  }

  get armorType() {
    return this.data.armorType.value;
  }

  get armorBonus() {
    return getArmorBonus(this.data);
  }

  wornDexBonus(character) {
    return Math.min(character.abilities.dex.mod, this.maxDex);
  }
}

export default Armor;
