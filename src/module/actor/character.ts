import Armor from './armor';

/**
 * @category Other
 */
class CharacterData {
  data: any;
  _items: any;
  
  constructor(data, items?) {
    this.data = data;
    this._items = items;
  }

  get level() {
    return parseInt(this.data.details.level.value, 10);
  }

  get maxExp() {
    return this.data.details.xp.max;
  }

  get exp() {
    return this.data.details.xp.value;
  }

  get xpPercent() {
    return Math.min(Math.round((this.exp * 100) / this.maxExp), 99.5);
  }

  get items() {
    return this._items || [];
  }

  get abilities() {
    return this.data.abilities;
  }

  get martial() {
    return this.data.martial;
  }


  // AC
  // Level + Proficiency w/ type + floor(dex, dexcap) + item AC + item potency - penalties?
  get ac() {
    const armorProficiency = this.martial[this.equippedArmor.armorType].value;
    const dexBonus = this.equippedArmor.wornDexBonus(this);
    const { armorBonus } = this.equippedArmor;
    return 10 + armorProficiency + dexBonus + armorBonus;
  }

  get skillCheckPenalty() {
    if (this.abilities.str.value < this.equippedArmor.strengthRequirement) {
      return this.equippedArmor.checkPenalty;
    }
    return 0;
  }

  get equippedArmor() {
    const equippedArmorItem = this.items
      .find((item) => Armor.isArmor(item.data));
    if (equippedArmorItem) {
      return new Armor(equippedArmorItem.data);
    }
    return Armor.unarmored();
  }
}

export default CharacterData;
