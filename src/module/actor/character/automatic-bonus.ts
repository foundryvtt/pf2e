import { WeaponPF2e } from "@item";
import { ModifierPF2e, MODIFIER_TYPE, DamageDicePF2e } from "@module/modifiers";
import { RuleElementSynthetics, StrikingPF2e, WeaponPotencyPF2e } from "@module/rules/rule-element";

export class AutomaticBonusProgression {
    /**
     * @param level The name of this collection of statistic modifiers.
     * @param synthetics All relevant modifiers for this statistic.
     */
    static concatModifiers(level: number, synthetics: RuleElementSynthetics) {
        if (game.settings.get("pf2e", "automaticBonusVariant") === "noABP") return;

        const values = this.abpValues(level);
        const ac = values.ac;
        const perception = values.perception;
        const save = values.save;

        if (save > 0) {
            synthetics.statisticsModifiers["saving-throw"] = (
                synthetics.statisticsModifiers["saving-throw"] || []
            ).concat(
                new ModifierPF2e({
                    slug: "save-potency",
                    label: "PF2E.AutomaticBonusProgression.savePotency",
                    modifier: save,
                    type: MODIFIER_TYPE.POTENCY,
                })
            );
        }

        if (ac > 0) {
            synthetics.statisticsModifiers["ac"] = (synthetics.statisticsModifiers["ac"] || []).concat(
                new ModifierPF2e({
                    slug: "defense-potency",
                    label: "PF2E.AutomaticBonusProgression.defensePotency",
                    modifier: ac,
                    type: MODIFIER_TYPE.POTENCY,
                })
            );
        }

        if (perception > 0) {
            synthetics.statisticsModifiers["perception"] = (synthetics.statisticsModifiers["perception"] || []).concat(
                new ModifierPF2e({
                    slug: "perception-potency",
                    label: "PF2E.AutomaticBonusProgression.perceptionPotency",
                    modifier: perception,
                    type: MODIFIER_TYPE.POTENCY,
                })
            );
        }

        if (game.settings.get("pf2e", "automaticBonusVariant") === "ABPRulesAsWritten") {
            const values = this.abpValues(level);
            const attack = values.attack;
            const damage = values.damage;
            if (attack > 0) {
                synthetics.statisticsModifiers["mundane-attack"] = (
                    synthetics.statisticsModifiers["mundane-attack"] || []
                ).concat(
                    new ModifierPF2e({
                        slug: "attack-potency",
                        label: "PF2E.AutomaticBonusProgression.attackPotency",
                        modifier: attack,
                        type: MODIFIER_TYPE.POTENCY,
                    })
                );
            }

            if (damage > 0) {
                synthetics.damageDice["damage"] = (synthetics.damageDice["damage"] || []).concat(
                    new DamageDicePF2e({
                        slug: "devasting-attacks",
                        label: game.i18n.localize("PF2E.AutomaticBonusProgression.devastatingAttacks"),
                        selector: "damage",
                        diceNumber: damage,
                    })
                );
            }
        }

        if (game.settings.get("pf2e", "automaticBonusVariant") === "ABPFundamentalPotency") {
            const values = this.abpValues(level);
            const attack = values.attack;
            const damage = values.damage;

            if (damage > 0) {
                const s: StrikingPF2e = {
                    label: game.i18n.localize("PF2E.AutomaticBonusProgression.devastatingAttacks"),
                    bonus: damage,
                };
                synthetics.striking["mundane-damage"] = (synthetics.striking["mundane-damage"] || []).concat(s);
            }
            if (attack > 0) {
                const potency: WeaponPotencyPF2e = {
                    label: game.i18n.localize("PF2E.AutomaticBonusProgression.attackPotency"),
                    type: MODIFIER_TYPE.POTENCY,
                    bonus: attack,
                };
                synthetics.weaponPotency["mundane-attack"] = (synthetics.weaponPotency["mundane-attack"] || []).concat(
                    potency
                );
            }
        }
    }

    /** Remove stored runes from specific magic weapons or otherwise set prior to enabling ABP */
    static cleanupRunes(weapon: WeaponPF2e): void {
        const setting = game.settings.get("pf2e", "automaticBonusVariant");
        const systemData = weapon.data.data;

        switch (setting) {
            case "noABP":
                return;
            case "ABPRulesAsWritten": {
                systemData.potencyRune.value = null;
                systemData.strikingRune.value = null;
                const propertyRunes = ([1, 2, 3, 4] as const).map((n) => systemData[`propertyRune${n}` as const]);
                for (const rune of propertyRunes) {
                    rune.value = null;
                }
                return;
            }
            case "ABPFundamentalPotency": {
                systemData.potencyRune.value = null;
                systemData.strikingRune.value = null;
                return;
            }
        }
    }

    static applyPropertyRunes(potency: WeaponPotencyPF2e[], weapon: Embedded<WeaponPF2e>): void {
        if (game.settings.get("pf2e", "automaticBonusVariant") !== "ABPFundamentalPotency") return;
        const potencyBonuses = potency.filter((p) => p.type === "potency");
        for (const bonus of potencyBonuses) {
            bonus.property = deepClone(weapon.data.data.runes.property);
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
