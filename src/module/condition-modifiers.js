import { PF2ModifierType, PF2Modifier } from './modifiers.js';

export const BLINDED = Object.freeze({
  get: () => ({
    perception: new PF2Modifier('PF2E.condition.blinded.name', -4, PF2ModifierType.STATUS)
  })
});
export const CLUMSY = Object.freeze({
  withValue: (value) => ({
    'dex-based': new PF2Modifier('PF2E.condition.clumsy.name', -value, PF2ModifierType.STATUS),
    'dex-damage': new PF2Modifier('PF2E.condition.clumsy.name', -value, PF2ModifierType.STATUS),
  })
});
export const DRAINED = Object.freeze({
  withValue: (value) => ({
    fortitude: new PF2Modifier('PF2E.condition.drained.name', -value, PF2ModifierType.STATUS),
  })
});
export const ENFEEBLED = Object.freeze({
  withValue: (value) => ({
    'str-based': new PF2Modifier('PF2E.condition.enfeebled.name', -value, PF2ModifierType.STATUS),
    'str-damage': new PF2Modifier('PF2E.condition.enfeebled.name', -value, PF2ModifierType.STATUS),
  })
});
export const FASCINATED = Object.freeze({
  get: () => ({
    // maybe we can come up with a better way of dealing with "all skills", like a marker value
    perception: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    acrobatics: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    arcana: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    athletics: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    crafting: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    deception: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    diplomacy: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    intimidation: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    lore: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    medicine: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    nature: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    occultism: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    performance: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    religion: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    society: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    stealth: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    survival: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
    thievery: new PF2Modifier('PF2E.condition.fascinated.name', -2, PF2ModifierType.STATUS),
  })
});
export const FATIGUED = Object.freeze({
  get: () => ({
    ac: new PF2Modifier('PF2E.condition.fatigued.name', -1, PF2ModifierType.STATUS),
    fortitude: new PF2Modifier('PF2E.condition.fatigued.name', -1, PF2ModifierType.STATUS),
    reflex: new PF2Modifier('PF2E.condition.fatigued.name', -1, PF2ModifierType.STATUS),
    will: new PF2Modifier('PF2E.condition.fatigued.name', -1, PF2ModifierType.STATUS),
  })
});
export const FLAT_FOOTED = Object.freeze({
  get: () => ({
    ac: new PF2Modifier('PF2E.condition.flatFooted.name', -2, PF2ModifierType.CIRCUMSTANCE),
  })
});
export const FRIGHTENED = Object.freeze({
  withValue: (value) => ({
    all: new PF2Modifier('PF2E.condition.frightened.name', -value, PF2ModifierType.STATUS),
  })
});
export const SICKENED = Object.freeze({
  withValue: (value) => ({
    all: new PF2Modifier('PF2E.condition.sickened.name', -value, PF2ModifierType.STATUS),
  })
});
export const STUPEFIED = Object.freeze({
  withValue: (value) => ({
    // also applies to spell attack rolls, spell DCs, and skill checks that use these ability scores
    'int-based': new PF2Modifier('PF2E.condition.stupefied.name', -value, PF2ModifierType.STATUS),
    'wis-based': new PF2Modifier('PF2E.condition.stupefied.name', -value, PF2ModifierType.STATUS),
    'cha-based': new PF2Modifier('PF2E.condition.stupefied.name', -value, PF2ModifierType.STATUS),
  })
});
export const UNCONSCIOUS = Object.freeze({
  get: () => ({
    ac: new PF2Modifier('PF2E.condition.unconscious.name', -4, PF2ModifierType.STATUS),
    reflex: new PF2Modifier('PF2E.condition.unconscious.name', -4, PF2ModifierType.STATUS),
    perception: new PF2Modifier('PF2E.condition.unconscious.name', -4, PF2ModifierType.STATUS),
  })
});

export const ConditionModifiers = Object.freeze({
  /**
   * Calculates modifiers for conditions (from status effects).
   * 
   * @param {object} statisticsModifiers
   * @param {{status: string, active: boolean, type: string, value: number}} statusEffect
   */
  addStatisticModifiers: (statisticsModifiers, statusEffect) => {
    if (statusEffect && statusEffect.active && statusEffect.type === 'condition') {
      let modifiers = {};
      switch (statusEffect.status) {
        case 'blinded': modifiers = BLINDED.get(); break;
        case 'clumsy': modifiers = CLUMSY.withValue(statusEffect.value || 1); break;
        case 'drained': modifiers = DRAINED.withValue(statusEffect.value || 1); break;
        case 'enfeebled': modifiers = ENFEEBLED.withValue(statusEffect.value || 1); break;
        case 'fascinated': modifiers = FASCINATED.get(); break;
        case 'fatigued': modifiers = FATIGUED.get(); break;
        case 'flatFooted': modifiers = FLAT_FOOTED.get(); break;
        case 'frightened': modifiers = FRIGHTENED.withValue(statusEffect.value || 1); break;
        case 'sickened': modifiers = SICKENED.withValue(statusEffect.value || 1); break;
        case 'stupefied': modifiers = STUPEFIED.withValue(statusEffect.value || 1); break;
        case 'unconscious': modifiers = UNCONSCIOUS.get(); break;
        default: // do nothing
      }
      for (const [statistic, modifier] of Object.entries(modifiers)) {
        statisticsModifiers[statistic] = (statisticsModifiers[statistic] || []).concat(modifier); // eslint-disable-line no-param-reassign
      }
    }
  }
});
