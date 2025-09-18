import { DamageDicePF2e, MODIFIER_TYPES, Modifier, ModifierType } from "@actor/modifiers.ts";
import type { ActorType } from "@actor/types.ts";
import type { MeleePF2e, WeaponPF2e } from "@item";
import { RollNotePF2e } from "@module/notes.ts";
import { DamageCategoryUnique, DamageType } from "@system/damage/types.ts";
import { DAMAGE_CATEGORIES_UNIQUE } from "@system/damage/values.ts";
import * as R from "remeda";
import { CritSpecEffect } from "../synthetics.ts";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleValue } from "./data.ts";
import fields = foundry.data.fields;

/** Substitute a pre-determined result for a check's D20 roll */
class CritSpecRuleElement extends RuleElement<CritSpecRuleSchema> {
    static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): CritSpecRuleSchema {
        return {
            ...super.defineSchema(),
            alternate: new fields.BooleanField(),
            text: new fields.StringField({ blank: false, nullable: true, initial: null }),
            damageDice: new fields.SchemaField(
                {
                    number: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
                    faces: new fields.NumberField({
                        required: true,
                        nullable: false,
                        choices: [4, 6, 8, 10, 12],
                        initial: undefined,
                    }),
                    damageType: new fields.StringField({
                        required: false,
                        nullable: true,
                        choices: () => CONFIG.PF2E.damageTypes,
                        initial: null,
                    }),
                    category: new fields.StringField({
                        required: false,
                        nullable: true,
                        choices: DAMAGE_CATEGORIES_UNIQUE,
                        initial: null,
                    }),
                },
                { required: false, nullable: true, initial: null },
            ),
            modifier: new fields.SchemaField(
                {
                    type: new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: Array.from(MODIFIER_TYPES),
                        initial: "untyped",
                    }),
                    damageType: new fields.StringField({
                        required: false,
                        nullable: true,
                        choices: () => CONFIG.PF2E.damageTypes,
                        initial: null,
                    }),
                    category: new fields.StringField({
                        required: false,
                        nullable: true,
                        choices: Array.from(DAMAGE_CATEGORIES_UNIQUE),
                        initial: null,
                    }),
                    value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
                },
                { required: false, nullable: true, initial: null },
            ),
        };
    }

    static override validateJoint(data: fields.SourceFromSchema<CritSpecRuleSchema>): void {
        super.validateJoint(data);

        if (data.alternate && !data.text && !data.damageDice && !data.modifier) {
            throw Error("alternate: must also include at least one of text, damage dice, or modifier");
        } else if (!data.alternate && (data.text || data.damageDice || data.modifier)) {
            const badProperty = (["text", "damageDice", "modifier"] as const).find((k) => data[k]);
            throw Error(`${badProperty}: may only be used if alternate is true`);
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const synthetic = (weapon: WeaponPF2e | MeleePF2e, options: Set<string>): CritSpecEffect | null => {
            const predicate = this.resolveInjectedProperties(this.predicate);
            return predicate.test(options) ? this.#getEffect(weapon) : null;
        };
        // Return early if value resolution failed
        if (this.ignored) return;

        this.actor.synthetics.criticalSpecializations[this.alternate ? "alternate" : "standard"].push(synthetic);
    }

    #getEffect(weapon: WeaponPF2e | MeleePF2e): CritSpecEffect {
        const text = this.text ? this.resolveInjectedProperties(this.text.trim()) : null;
        const slug = "critical-specialization";
        const label = "PF2E.Actor.Creature.CriticalSpecialization";

        const note = () =>
            this.alternate && !this.text
                ? null
                : new RollNotePF2e({
                      selector: "strike-damage",
                      title: label,
                      text: text ?? `PF2E.Item.Weapon.CriticalSpecialization.${weapon.group}`,
                      outcome: ["criticalSuccess"],
                  });

        const resolveInteger = (value: RuleValue, fallback: number) => {
            const resolved = this.resolveValue(value, 0, { resolvables: { weapon } });
            return Math.clamp(Math.trunc(Math.abs(Number(resolved))), 1, 10) || fallback;
        };

        const damageDice = () =>
            this.alternate && this.damageDice
                ? new DamageDicePF2e({
                      slug,
                      label,
                      selector: "strike-damage",
                      diceNumber: resolveInteger(this.damageDice.number, 1),
                      dieSize: `d${this.damageDice.faces}`,
                      damageType: this.damageDice.damageType,
                      category: this.damageDice.category,
                      critical: true,
                  })
                : null;

        const modifier = () =>
            this.alternate && this.modifier
                ? new Modifier({
                      slug,
                      label,
                      type: this.modifier.type,
                      modifier: resolveInteger(this.modifier.value, 0),
                      damageType: this.modifier.damageType,
                      damageCategory: this.modifier.category,
                      critical: true,
                  })
                : null;

        if (this.alternate) {
            return [note(), damageDice(), modifier()].filter(R.isTruthy);
        }

        switch (weapon.group) {
            case "crossbow":
            case "dart":
            case "knife": {
                const dice = new DamageDicePF2e({
                    slug,
                    selector: "strike-damage",
                    label,
                    damageType: "bleed",
                    diceNumber: 1,
                    dieSize: weapon.group === "crossbow" ? "d8" : "d6",
                    critical: true,
                });
                const bonusValue = weapon.isOfType("melee")
                    ? (weapon.linkedWeapon?.system.runes.potency ?? 0)
                    : weapon.flags.pf2e.attackItemBonus;
                const bonus =
                    bonusValue > 0
                        ? new Modifier({
                              slug,
                              label,
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
                          new Modifier({
                              slug,
                              label,
                              type: "untyped",
                              modifier: 2 * weapon.baseDamage.dice,
                              critical: true,
                          }),
                      ]
                    : [];
            default: {
                return weapon.group ? [note()].filter(R.isTruthy) : [];
            }
        }
    }
}

interface CritSpecRuleElement extends RuleElement<CritSpecRuleSchema>, ModelPropsFromRESchema<CritSpecRuleSchema> {}

type DamageDieFaces = 4 | 6 | 8 | 10 | 12;

type CritSpecRuleSchema = RuleElementSchema & {
    /** Whether this critical specialization note substitutes for the standard one of a given weapon group */
    alternate: fields.BooleanField;
    /** Alternative note text: if not provided, the standard one for a given weapon group is used */
    text: fields.StringField<string, string, false, true, true>;
    /** Alternative damage dice */
    damageDice: fields.SchemaField<
        {
            number: ResolvableValueField<true, false, false>;
            faces: fields.NumberField<DamageDieFaces, DamageDieFaces, true, false, false>;
            damageType: fields.StringField<DamageType, DamageType, false, true, true>;
            category: fields.StringField<DamageCategoryUnique, DamageCategoryUnique, false, true, true>;
        },
        {
            number: RuleValue;
            faces: DamageDieFaces;
            damageType: DamageType | null;
            category: DamageCategoryUnique | null;
        },
        {
            number: RuleValue;
            faces: DamageDieFaces;
            damageType: DamageType | null;
            category: DamageCategoryUnique | null;
        },
        false,
        true,
        true
    >;
    /** Alternative modifier */
    modifier: fields.SchemaField<
        {
            type: fields.StringField<ModifierType, ModifierType, true, false, true>;
            damageType: fields.StringField<DamageType, DamageType, false, true, true>;
            category: fields.StringField<DamageCategoryUnique, DamageCategoryUnique, false, true, true>;
            value: ResolvableValueField<true, false, false>;
        },
        {
            type: ModifierType;
            damageType: DamageType | null;
            category: DamageCategoryUnique | null;
            value: RuleValue;
        },
        {
            type: ModifierType;
            damageType: DamageType | null;
            category: DamageCategoryUnique | null;
            value: RuleValue;
        },
        false,
        true,
        true
    >;
};

export { CritSpecRuleElement };
