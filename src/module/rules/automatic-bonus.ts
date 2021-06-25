import { ModifierPF2e, MODIFIER_TYPE, DamageDicePF2e } from '@module/modifiers'; //, DiceModifierPF2e, DamageDicePF2e
import { RuleElementSyntheticsPF2e, StrikingPF2e, WeaponPotencyPF2e } from './rules-data-definitions';

export class AutomaticBonusProgression {
    /**
     * @param level The name of this collection of statistic modifiers.
     * @param synthetics All relevant modifiers for this statistic.
     */
    static concatModifiers(level: number, synthetics: RuleElementSyntheticsPF2e) {
        if (game.settings.get('pf2e', 'automaticBonusVariant') === 'noABP') return;

        const values = this.abpValues(level);
        const ac = values.ac;
        const perception = values.perception;
        const save = values.save;

        if (save > 0) {
            synthetics.statisticsModifiers['saving-throw'] = (
                synthetics.statisticsModifiers['saving-throw'] || []
            ).concat(
                new ModifierPF2e(
                    game.i18n.localize('PF2E.AutomaticBonusProgression.savePotency'),
                    save,
                    MODIFIER_TYPE.POTENCY,
                ),
            );
        }

        if (ac > 0) {
            synthetics.statisticsModifiers['ac'] = (synthetics.statisticsModifiers['ac'] || []).concat(
                new ModifierPF2e(
                    game.i18n.localize('PF2E.AutomaticBonusProgression.defensePotency'),
                    ac,
                    MODIFIER_TYPE.POTENCY,
                ),
            );
        }

        if (perception > 0) {
            synthetics.statisticsModifiers['perception'] = (synthetics.statisticsModifiers['perception'] || []).concat(
                new ModifierPF2e(
                    game.i18n.localize('PF2E.AutomaticBonusProgression.perceptionPotency'),
                    perception,
                    MODIFIER_TYPE.POTENCY,
                ),
            );
        }

        if (game.settings.get('pf2e', 'automaticBonusVariant') === 'ABPRulesAsWritten') {
            const values = this.abpValues(level);
            const attack = values.attack;
            const damage = values.damage;
            if (attack > 0) {
                synthetics.statisticsModifiers['mundane-attack'] = (
                    synthetics.statisticsModifiers['mundane-attack'] || []
                ).concat(
                    new ModifierPF2e(
                        game.i18n.localize('PF2E.AutomaticBonusProgression.attackPotency'),
                        attack,
                        MODIFIER_TYPE.POTENCY,
                    ),
                );
            }

            if (damage > 0) {
                synthetics.damageDice['damage'] = (synthetics.damageDice['damage'] || []).concat(
                    new DamageDicePF2e({
                        name: game.i18n.localize('PF2E.AutomaticBonusProgression.devastatingAttacks'),
                        selector: 'damage',
                        diceNumber: damage,
                    }),
                );
            }
        }

        if (game.settings.get('pf2e', 'automaticBonusVariant') === 'ABPFundamentalPotency') {
            const values = this.abpValues(level);
            const attack = values.attack;
            const damage = values.damage;

            if (damage > 0) {
                const s: StrikingPF2e = {
                    label: game.i18n.localize('PF2E.AutomaticBonusProgression.devastatingAttacks'),
                    bonus: damage,
                };
                synthetics.striking['mundane-damage'] = (synthetics.striking['mundane-damage'] || []).concat(s);
            }
            if (attack > 0) {
                const potency: WeaponPotencyPF2e = {
                    label: game.i18n.localize('PF2E.AutomaticBonusProgression.attackPotency'),
                    bonus: attack,
                };
                synthetics.weaponPotency['mundane-attack'] = (synthetics.weaponPotency['mundane-attack'] || []).concat(
                    potency,
                );
            }
        }
    }

    private static abpValues(level: number) {
        let attack: number;
        let damage: number;
        let ac: number;
        let perception: number;
        let save: number;
        if (level >= 2 && level < 10) {
            attack = 1;
        } else if (level >= 10 && level < 16) {
            attack = 2;
        } else if (level >= 16) {
            attack = 3;
        } else {
            attack = 0;
        }
        if (level >= 4 && level < 12) {
            damage = 1;
        } else if (level >= 12 && level < 19) {
            damage = 2;
        } else if (level >= 19) {
            damage = 3;
        } else {
            damage = 0;
        }
        if (level >= 5 && level < 11) {
            ac = 1;
        } else if (level >= 11 && level < 18) {
            ac = 2;
        } else if (level >= 18) {
            ac = 3;
        } else {
            ac = 0;
        }
        if (level >= 7 && level < 13) {
            perception = 1;
        } else if (level >= 13 && level < 19) {
            perception = 2;
        } else if (level >= 19) {
            perception = 3;
        } else {
            perception = 0;
        }
        if (level >= 8 && level < 14) {
            save = 1;
        } else if (level >= 14 && level < 20) {
            save = 2;
        } else if (level >= 20) {
            save = 3;
        } else {
            save = 0;
        }
        return { attack: attack, damage: damage, ac: ac, perception: perception, save: save };
    }
}
