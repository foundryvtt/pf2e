import { ActorPF2e } from "@actor";
import { ModifierPF2e, MODIFIER_TYPE } from "@actor/modifiers";
import { ArmorPF2e, WeaponPF2e } from "@item";
import { ZeroToThree } from "@module/data";
import { FlatModifierRuleElement } from "@module/rules/rule-element/flat-modifier";
import { PotencySynthetic } from "@module/rules/synthetics";
import { PredicatePF2e } from "@system/predication";
import { CharacterPF2e } from "./document";

class AutomaticBonusProgression {
    /** Whether the ABP variant is enabled and also not selectively disabled for a particular actor */
    static isEnabled(actor: ActorPF2e | null): boolean {
        // Synthetic actors begin data preparation before their data model is initialized
        if (!actor?.flags) return false;

        const settingEnabled = game.settings.get("pf2e", "automaticBonusVariant") !== "noABP";
        const actorIsPC = actor.isOfType("character") && !actor.flags.pf2e.disableABP;

        return settingEnabled && actorIsPC;
    }

    /** Get striking damage dice according to character level */
    static getStrikingDice(level: number): ZeroToThree {
        return level < 4 ? 0 : level < 12 ? 1 : level < 19 ? 2 : 3;
    }

    /**
     * @param level The name of this collection of statistic modifiers.
     * @param synthetics All relevant modifiers for this statistic.
     */
    static concatModifiers(actor: CharacterPF2e): void {
        if (!this.isEnabled(actor)) return;

        const { level, synthetics } = actor;
        const values = this.abpValues(level);
        const ac = values.ac;
        const perception = values.perception;
        const save = values.save;
        const setting = game.settings.get("pf2e", "automaticBonusVariant");

        if (save > 0) {
            const modifiers = (synthetics.statisticsModifiers["saving-throw"] ??= []);
            modifiers.push(
                () =>
                    new ModifierPF2e({
                        slug: "save-potency",
                        label: "PF2E.AutomaticBonusProgression.savePotency",
                        modifier: save,
                        type: MODIFIER_TYPE.POTENCY,
                    })
            );
        }

        if (ac > 0) {
            const modifiers = (synthetics.statisticsModifiers["ac"] ??= []);
            modifiers.push(
                () =>
                    new ModifierPF2e({
                        slug: "defense-potency",
                        label: "PF2E.AutomaticBonusProgression.defensePotency",
                        modifier: ac,
                        type: MODIFIER_TYPE.POTENCY,
                    })
            );
        }

        if (perception > 0) {
            const modifiers = (synthetics.statisticsModifiers["perception"] ??= []);
            modifiers.push(
                () =>
                    new ModifierPF2e({
                        slug: "perception-potency",
                        label: "PF2E.AutomaticBonusProgression.perceptionPotency",
                        modifier: perception,
                        type: MODIFIER_TYPE.POTENCY,
                    })
            );
        }

        if (setting === "ABPRulesAsWritten") {
            const values = this.abpValues(level);
            const attack = values.attack;
            if (attack > 0) {
                const modifiers = (synthetics.statisticsModifiers["strike-attack-roll"] ??= []);
                modifiers.push(
                    () =>
                        new ModifierPF2e({
                            slug: "attack-potency",
                            label: "PF2E.AutomaticBonusProgression.attackPotency",
                            modifier: attack,
                            type: "potency",
                        })
                );
            }
        }

        if (setting === "ABPFundamentalPotency") {
            const values = this.abpValues(level);
            const attack = values.attack;

            if (attack > 0) {
                const potency: PotencySynthetic = {
                    label: game.i18n.localize("PF2E.AutomaticBonusProgression.attackPotency"),
                    type: "potency",
                    bonus: attack,
                    predicate: new PredicatePF2e(),
                };
                const potencySynthetics = (synthetics.weaponPotency["strike-attack-roll"] ??= []);
                potencySynthetics.push(potency);
            }
        }
    }

    /** Remove stored runes from specific magic weapons or otherwise set prior to enabling ABP */
    static cleanupRunes(item: ArmorPF2e | WeaponPF2e): void {
        if (!this.isEnabled(item.actor)) return;

        item.system.potencyRune.value = null;
        const otherFundamental = item.isOfType("weapon") ? item.system.strikingRune : item.system.resiliencyRune;
        otherFundamental.value = null;

        const setting = game.settings.get("pf2e", "automaticBonusVariant");
        if (setting === "ABPRulesAsWritten") {
            const propertyRunes = ([1, 2, 3, 4] as const).map((n) => item.system[`propertyRune${n}` as const]);
            for (const rune of propertyRunes) {
                rune.value = null;
            }
        }
    }

    static applyPropertyRunes(potency: PotencySynthetic[], weapon: Embedded<WeaponPF2e>): void {
        if (game.settings.get("pf2e", "automaticBonusVariant") !== "ABPFundamentalPotency") return;
        const potencyBonuses = potency.filter((p) => p.type === "potency");
        for (const bonus of potencyBonuses) {
            bonus.property = deepClone(weapon.system.runes.property);
        }
    }

    /**
     * Determine whether a rule element can be applied to an actor.
     * @param rule The rule element to assess
     * @returns Whether the rule element is to be ignored
     */
    static suppressRuleElement(rule: FlatModifierRuleElement, value: number): boolean {
        return this.isEnabled(rule.actor) && rule.type === "item" && value >= 0 && rule.fromEquipment;
    }

    static getAttackPotency(level: number): ZeroToThree {
        return level < 2 ? 0 : level < 10 ? 1 : level < 16 ? 2 : 3;
    }

    private static abpValues(level: number): AutomaticBonuses {
        const attack = this.getAttackPotency(level);
        let ac: number;
        let perception: number;
        let save: number;
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
        return { attack, ac, perception, save };
    }
}

interface AutomaticBonuses {
    attack: number;
    ac: number;
    perception: number;
    save: number;
}

export { AutomaticBonusProgression };
