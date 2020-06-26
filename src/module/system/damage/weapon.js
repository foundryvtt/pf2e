import { PF2DamageDice, PF2Modifier, PF2ModifierType, PF2ModifierPredicate, PF2StatisticModifier } from '../../modifiers.js';

// eslint-disable-next-line import/prefer-default-export
export class PF2WeaponDamage {

  static calculate(weapon, actor, traits = [], statisticsModifiers, damageDice, proficiencyRank = 0, options = []) {
    let effectDice = weapon.data.damage.dice ?? 1;
    const diceModifiers = [];
    const numericModifiers = [];
    const baseTraits = [];

    // striking rune
    if (weapon.data?.strikingRune?.value) {
      let diceNumber;
      switch (weapon.data?.strikingRune?.value) {
        case 'striking': diceNumber = 1; break;
        case 'greaterStriking': diceNumber = 2; break;
        case 'majorStriking': diceNumber = 3; break;
        default: diceNumber = 0;
      }
      if (diceNumber > 0) {
        effectDice += diceNumber;
        diceModifiers.push({
          name: CONFIG.PF2E.weaponStrikingRunes[weapon.data.strikingRune.value],
          diceNumber,
          enabled: true,
          traits: ['magical'],
        });
      }
    }

    // property runes
    for (const slot of [1, 2, 3, 4]) {
      const rune = weapon.data[`propertyRune${slot}`]?.value;
      // flaming rune
      if (rune === 'flaming') {
        diceModifiers.push({
          name: CONFIG.PF2E.weaponPropertyRunes[rune],
          diceNumber: 1,
          dieSize: 'd6',
          category: this.getDamageCategory('fire'),
          damageType: 'fire',
          enabled: true,
          traits: ['fire'],
        });
      } else if (rune === 'thundering') {
        diceModifiers.push({
          name: CONFIG.PF2E.weaponPropertyRunes[rune],
          diceNumber: 1,
          dieSize: 'd6',
          category: this.getDamageCategory('sonic'),
          damageType: 'sonic',
          enabled: true,
          traits: ['sonic'],
        });
      }
    }

    // mystic strikes
    if (actor.items.some(i => i.type === 'feat' && i.name === 'Mystic Strikes')
      && traits.some(t => t.name.startsWith('unarmed'))
    ) {
      diceModifiers.push({
        name: 'Mystic Strikes',
        enabled: true,
        traits: ['magical'],
      });
    }

    // deadly trait
    traits.filter(t => t.name.startsWith('deadly-')).forEach(t => {
      let diceNumber;
      switch (weapon.data?.strikingRune?.value) {
        case 'greaterStriking': diceNumber = 2; break;
        case 'majorStriking': diceNumber = 3; break;
        default: diceNumber = 1;
      }
      diceModifiers.push({
        name: CONFIG.weaponTraits[t.name],
        diceNumber,
        dieSize: t.name.substring(t.name.indexOf('-') + 1),
        critical: true,
        enabled: true,
      });
    });

    // fatal trait
    traits.filter(t => t.name.startsWith('fatal-')).forEach(t => {
      const dieSize = t.name.substring(t.name.indexOf('-') + 1);
      diceModifiers.push({
        name: CONFIG.weaponTraits[t.name],
        diceNumber: 1,
        dieSize,
        critical: true,
        enabled: true,
        override: { dieSize },
      });
    });

    // determine ability modifier
    let ability;
    {
      let modifier;
      const melee = ['melee', 'reach', ''].includes(weapon.data?.range?.value?.trim()) || traits.some(t => t.name.startsWith('thrown'));
      if (melee) {
        ability = 'str';
        modifier = Math.floor((actor.data.abilities.str.value - 10) / 2);
      }

      if (traits.some(t => t.name === 'propulsive')) {
        ability = 'str';
        const strengthModifier = Math.floor((actor.data.abilities.str.value - 10) / 2);
        modifier = (strengthModifier < 0) ? strengthModifier : Math.floor(strengthModifier / 2);
        baseTraits.push('propulsive');
      }

      // check for Rogue's Racket: Thief
      if (actor.items.some(i => i.type === 'feat' && i.name === 'Thief Racket') // character has Thief Racket class feature
        && (traits.some(t => t.name === 'finesse') && melee) // finesse melee weapon
        && Math.floor((actor.data.abilities.dex.value - 10) / 2) > modifier // dex bonus higher than the current bonus
      ) {
        ability = 'dex';
        modifier = Math.floor((actor.data.abilities.dex.value - 10) / 2);
      }

      if (ability) {
        numericModifiers.push(new PF2Modifier(CONFIG.abilities[ability], modifier, PF2ModifierType.ABILITY));
      }
    }

    // conditions and custom modifiers
    {
      const stats = [];
      if (weapon.data?.group?.value) {
        stats.push(`${weapon.data.group.value.toLowerCase()}-weapon-group-damage`);
      }
      if (ability) {
        stats.push(`${ability}-damage`);
      }
      const proficiencies = ['untrained', 'trained', 'expert', 'master', 'legendary'];
      stats.push(`${proficiencies[proficiencyRank]}-damage`);
      stats.push(`${weapon.name.replace(/\s+/g, '-').toLowerCase()}-damage`); // convert white spaces to dash and lower-case all letters
      stats.concat([`${weapon._id}-damage`, 'damage']).forEach((key) => {
        (statisticsModifiers[key] || []).map((m) => duplicate(m)).forEach((m) => {
          const modifier = new PF2Modifier(game.i18n.localize(m.name), m.modifier, m.type);
          if (m.damageType) {
            modifier.damageType = m.damageType;
          }
          modifier.ignored = !new PF2ModifierPredicate(m.predicate ?? {}).test(traits.map(t => t.name).concat(options));
          numericModifiers.push(modifier);
        });
      });
    }

    const damage = {
      name: `Damage Roll: ${weapon.name}`,
      base: {
        diceNumber: weapon.data.damage.dice,
        dieSize: weapon.data.damage.die,
        category: this.getDamageCategory(weapon.data.damage.damageType),
        damageType: weapon.data.damage.damageType,
        traits: [],
      },
      // CRB p. 279, Counting Damage Dice: Effects based on a weapon's number of damage dice include
      // only the weapon's damage die plus any extra dice from a striking rune. They don't count
      // extra dice from abilities, critical specialization effects, property runes, weapon traits,
      // or the like.
      effectDice,
      diceModifiers,
      numericModifiers,
      // the below fields are calculated
      traits: baseTraits,
      formula: {},
    };

    // non-lethal trait
    if (traits.some(t => t.name === 'nonlethal')) {
      damage.traits.push('nonlethal');
    }

    // custom dice
    {
      const stats = [];
      stats.push(`${weapon.name.replace(/\s+/g, '-').toLowerCase()}-damage`); // convert white spaces to dash and lower-case all letters
      stats.concat([`${weapon._id}-damage`, 'damage']).forEach((key) => {
        (damageDice[key] || []).map((d) => new PF2DamageDice(d)).forEach((d) => {
          // eslint-disable-next-line no-param-reassign
          d.enabled = d.predicate.test(traits.map(t => t.name).concat(options));
          diceModifiers.push(d);
        });
      });
    }

    // include dice number and size in damage tag
    diceModifiers.forEach(d => {
      /* eslint-disable no-param-reassign */
      d.name = game.i18n.localize(d.name);
      if (d.diceNumber > 0 && d.dieSize) {
        d.name += ` +${d.diceNumber}${d.dieSize}`;
      } else if (d.diceNumber > 0) {
        d.name += ` +${d.diceNumber}${damage.base.dieSize}`;
      } else if (d.dieSize) {
        d.name += ` ${d.dieSize}`;
      }
      if (
        d.category &&
        (d.diceNumber > 0 || d.dieSize) &&
        (!d.damageType || d.damageType === damage.base.damageType)
      ) {
          d.name += ` ${d.category}`;
      }
      /* eslint-enable no-param-reassign */
    });

    damage.formula.success = this.getFormula(damage, false);
    damage.formula.criticalSuccess = this.getFormula(damage, true);

    return damage;
  }

  static getDamageCategory(damageType) {
    return ['bludgeoning', 'piercing', 'slashing'].includes(damageType) ? 'physical' : 'energy';
  }

  static getFormula(damage, critical) {
    const base = JSON.parse(JSON.stringify(damage.base));

    // override first, to ensure the dice stacking works properly
    let overrideDieSize = null;
    let overrideDamageType = null;
    damage.diceModifiers.filter(dm => dm.enabled).filter(dm => dm.override).forEach(dm => {
      if (critical && dm.critical) {
        overrideDieSize = dm.override.dieSize ?? overrideDieSize;
        overrideDamageType = dm.override.damageType ?? overrideDamageType;
      } else if (!dm.critical) {
        overrideDieSize = dm.override.dieSize ?? overrideDieSize;
        overrideDamageType = dm.override.damageType ?? overrideDamageType;
      }
    });
    base.dieSize = overrideDieSize ?? base.dieSize;
    base.damageType = overrideDamageType ?? base.damageType;

    const dicePool = {};
    const critPool = {};
    dicePool[base.damageType] = {
      modifier: 0,
      [base.dieSize]: {
        diceNumber: base.diceNumber,
      },
      base: true,
    };

    // dice modifiers always stack
    damage.diceModifiers.filter(dm => dm.enabled).filter(dm => !dm.critical || critical).forEach(dm => {
      if (critical && dm.critical) {
        // critical-only stuff
        if (dm.diceNumber) {
          const pool = this.ensureDicePool(base, critPool, dm.damageType, dm.dieSize);
          pool[dm.damageType ?? base.damageType][dm.dieSize ?? base.dieSize].diceNumber += dm.diceNumber;
        }
        (dm.traits ?? []).filter(t => !damage.traits.includes(t)).forEach(t => { damage.traits.push(t) });
      } else if (!dm.critical) {
        // regular pool
        if (dm.diceNumber) {
          const pool = this.ensureDicePool(base, dicePool, dm.damageType, dm.dieSize);
          pool[dm.damageType ?? base.damageType][dm.dieSize ?? base.dieSize].diceNumber += dm.diceNumber;
        }
        (dm.traits ?? []).filter(t => !damage.traits.includes(t)).forEach(t => { damage.traits.push(t) });
      } else {
        // skip
      }
    });

    // apply stacking rules here and distribute on dice pools
    {
      const modifiers = [];
      damage.numericModifiers.filter(nm => nm.enabled).filter(nm => !nm.critical || critical).forEach(nm => {
        if (critical && nm.critical) {
          // critical-only stuff
          modifiers.push(nm);
        } else if (!nm.critical) {
          // regular pool
          modifiers.push(nm);
        } else {
          // skip
        }
      });
      Object.entries(modifiers.reduce((accumulator, current) => {
        // split numeric modifiers into separate lists for each damage type
        const dmg = current.damageType ?? base.damageType;
        accumulator[dmg] = (accumulator[dmg] ?? []).concat(current);
        return accumulator;
      }, {})).map(([damageType, damageTypeModifiers]) => {
        // apply stacking rules for numeric modifiers of each damage type separately 
        return new PF2StatisticModifier(`${damageType}-damage-stacking-rules`, damageTypeModifiers).modifiers;
      }).flatMap(nm => nm)
      .filter(nm => nm.enabled)
      .filter(nm => !nm.critical || critical)
      .forEach(nm => {
        let pool = dicePool[nm.damageType ?? base.damageType];
        if (!pool) {
          pool = {}
          dicePool[nm.damageType ?? base.damageType] = pool;
        }
        pool.modifier = (pool.modifier ?? 0) + nm.modifier;
        (nm.traits ?? []).filter(t => !damage.traits.includes(t)).forEach(t => { damage.traits.push(t) });
      });
    }

    // build formula
    let formula = this.buildFormula(dicePool);
    if (critical) {
      formula = `2 * (${formula})`;
      const critFormula = this.buildFormula(critPool);
      if (critFormula) {
        formula += ` + ${critFormula}`;
      }
    }

    return formula;
  }

  /**
   * Creates any intermediary objects in the dice pool for the specified damage type and die size.
   *
   * @param base
   * @param pool
   * @param damageType
   * @param dieSize
   * @return {*}
   */
  static ensureDicePool(base, pool, damageType, dieSize) {
    let p = pool[damageType ?? base.damageType];
    if (!p) {
      p = {}
      pool[damageType ?? base.damageType] = p; // eslint-disable-line no-param-reassign
    }
    let dice = p[dieSize ?? base.dieSize];
    if (!dice) {
      dice = {
        diceNumber: 0,
      };
      p[dieSize ?? base.dieSize] = dice;
    }
    return pool;
  }

  static buildFormula(pool) {
    let formula = '';
    for (const damageType in pool) {
      if (Object.prototype.hasOwnProperty.call(pool, damageType)) {
        let formulaPart = '';
        let modifier = 0;
        for (const dieSize in pool[damageType]) {
          if (Object.prototype.hasOwnProperty.call(pool[damageType], dieSize)) {
            if (dieSize === 'base') {
              // ignore
            } else if (dieSize === 'modifier') {
              modifier += pool[damageType][dieSize];
            } else if (formulaPart) {
              formulaPart += ` + ${pool[damageType][dieSize].diceNumber}${dieSize}`;
            } else {
              formulaPart = pool[damageType][dieSize].diceNumber + dieSize;
            }
          }
        }
        if (modifier !== 0) {
          if (formulaPart) {
            formulaPart += `${modifier < 0 ? modifier : ` + ${modifier}` }`;
          } else {
            formulaPart = modifier;
          }
        }
        if (pool[damageType].base) {
          formulaPart = `{${formulaPart}, 1}kh`;
        }
        formula += (formula ? ` + ${formulaPart}` : formulaPart);
      }
    }
    return formula;
  }

}
