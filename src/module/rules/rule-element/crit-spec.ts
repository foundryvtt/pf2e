import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ActorType } from "@actor/data/index.ts";
import { DamageDicePF2e, ModifierPF2e } from "@actor/modifiers.ts";
import { MeleePF2e, WeaponPF2e } from "@item";
import { RollNotePF2e } from "@module/notes.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import { CritSpecEffect } from "../synthetics.ts";
import { RuleElementPF2e, RuleElementSchema } from "./index.ts";

/** Substitute a pre-determined result for a check's D20 roll */
class CritSpecRuleElement extends RuleElementPF2e<CritSpecRuleSchema> {
    static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): CritSpecRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            alternate: new fields.BooleanField(),
            text: new fields.StringField({ blank: false, nullable: false, initial: undefined }),
        };
    }

    #validate(): void {
        if (this.alternate && !this.text) {
            return this.failValidation("An alternate critical specialization must include substitute text");
        }
    }

    override beforePrepareData(): void {
        this.#validate();
        if (this.ignored) return;

        const synthetic = (weapon: WeaponPF2e | MeleePF2e, options: Set<string>): CritSpecEffect | null => {
            const predicate = this.resolveInjectedProperties(this.predicate);
            return predicate.test(options) ? this.#getEffect(weapon) : null;
        };

        this.actor.synthetics.criticalSpecalizations[this.alternate ? "alternate" : "standard"].push(synthetic);
    }

    #getEffect(weapon: WeaponPF2e | MeleePF2e): CritSpecEffect {
        const text = this.text ? this.resolveInjectedProperties(this.text.trim()) : null;
        const note = () => [
            new RollNotePF2e({
                selector: "strike-damage",
                title: "PF2E.Actor.Creature.CriticalSpecialization",
                text: text ?? `PF2E.Item.Weapon.CriticalSpecialization.${weapon.group}`,
                outcome: ["criticalSuccess"],
            }),
        ];

        if (this.alternate) return note();

        const slug = "critical-specialization";

        switch (weapon.group) {
            case "dart":
            case "knife": {
                const dice = new DamageDicePF2e({
                    slug,
                    selector: "strike-damage",
                    label: "PF2E.Actor.Creature.CriticalSpecialization",
                    damageType: "bleed",
                    diceNumber: 1,
                    dieSize: "d6",
                    critical: true,
                });
                const bonusValue = ABP.isEnabled(this.actor)
                    ? ABP.getAttackPotency(this.actor.level)
                    : weapon.isOfType("melee")
                    ? weapon.linkedWeapon?.system.runes.potency ?? 0
                    : weapon.system.runes.potency;
                const bonus =
                    bonusValue > 0
                        ? new ModifierPF2e({
                              slug,
                              label: "PF2E.Actor.Creature.CriticalSpecialization",
                              type: "item",
                              damageType: "bleed",
                              modifier: bonusValue,
                              critical: true,
                          })
                        : null;
                return [dice, bonus ?? []].flat();
            }
            case "pick":
                return weapon.baseDamage.die
                    ? [
                          new ModifierPF2e({
                              slug,
                              label: "PF2E.Actor.Creature.CriticalSpecialization",
                              type: "untyped",
                              modifier: 2 * weapon.baseDamage.dice,
                              critical: true,
                          }),
                      ]
                    : [];
            default: {
                return weapon.group ? note() : [];
            }
        }
    }
}

interface CritSpecRuleElement extends RuleElementPF2e<CritSpecRuleSchema>, ModelPropsFromSchema<CritSpecRuleSchema> {}

type CritSpecRuleSchema = RuleElementSchema & {
    /** Whether this critical specialization note substitutes for the standard one of a given weapon group */
    alternate: BooleanField;
    /** Alternative note text: if not provided, the standard one for a given weapon group is used */
    text: StringField<string, string, false, false, false>;
};

export { CritSpecRuleElement };
