import type { ActorPF2e, CharacterPF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";
import type { ArmorPF2e, WeaponPF2e } from "@item";
import { ZeroToThree } from "@module/data.ts";
import type { FlatModifierRuleElement } from "@module/rules/rule-element/flat-modifier.ts";
import { PotencySynthetic } from "@module/rules/synthetics.ts";
import { Predicate } from "@system/predication.ts";

class AutomaticBonusProgression {
    /** Whether the ABP variant is enabled and also not selectively disabled for a particular actor */
    static isEnabled(actor: ActorPF2e | null): boolean {
        if (actor && !actor.flags?.pf2e) return false;
        const settingEnabled = game.pf2e.settings.variants.abp !== "noABP";
        const abpDisabledForActor = !!actor?.flags.pf2e.disableABP;

        return settingEnabled && !abpDisabledForActor;
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
        const setting = game.pf2e.settings.variants.abp;

        if (save > 0) {
            const modifiers = (synthetics.modifiers["saving-throw"] ??= []);
            modifiers.push(
                () =>
                    new ModifierPF2e({
                        slug: "save-potency",
                        label: "PF2E.AutomaticBonusProgression.savePotency",
                        modifier: save,
                        type: "potency",
                    }),
            );
        }

        if (ac > 0) {
            const modifiers = (synthetics.modifiers["ac"] ??= []);
            modifiers.push(
                () =>
                    new ModifierPF2e({
                        slug: "defense-potency",
                        label: "PF2E.AutomaticBonusProgression.defensePotency",
                        modifier: ac,
                        type: "potency",
                    }),
            );
        }

        if (perception > 0) {
            const modifiers = (synthetics.modifiers["perception"] ??= []);
            modifiers.push(
                () =>
                    new ModifierPF2e({
                        slug: "perception-potency",
                        label: "PF2E.AutomaticBonusProgression.perceptionPotency",
                        modifier: perception,
                        type: "potency",
                    }),
            );
        }

        if (setting === "ABPRulesAsWritten") {
            const values = this.abpValues(level);
            const attack = values.attack;
            if (attack > 0) {
                const modifiers = (synthetics.modifiers["strike-attack-roll"] ??= []);
                modifiers.push(
                    () =>
                        new ModifierPF2e({
                            slug: "attack-potency",
                            label: "PF2E.AutomaticBonusProgression.attackPotency",
                            modifier: attack,
                            type: "potency",
                        }),
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
                    predicate: new Predicate(),
                };
                const potencySynthetics = (synthetics.weaponPotency["strike-attack-roll"] ??= []);
                potencySynthetics.push(potency);
            }
        }
    }

    /** Remove stored runes from specific magic weapons or otherwise set prior to enabling ABP */
    static cleanupRunes(item: ArmorPF2e | WeaponPF2e): void {
        if (!this.isEnabled(item.actor)) return;

        item.system.grade &&= "commercial";
        item.system.runes.potency = 0;
        if (item.isOfType("weapon")) {
            item.system.runes.striking = 0;
        } else {
            item.system.runes.resilient = 0;
        }

        if (game.pf2e.settings.variants.abp === "ABPRulesAsWritten") {
            item.system.runes.property = [];
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

    static getDefensePotency(level: number): ZeroToThree {
        return level < 5 ? 0 : level < 11 ? 1 : level < 18 ? 2 : 3;
    }

    private static abpValues(level: number): AutomaticBonuses {
        const attack = this.getAttackPotency(level);
        const ac = this.getDefensePotency(level);

        let perception: number;
        let save: number;
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
