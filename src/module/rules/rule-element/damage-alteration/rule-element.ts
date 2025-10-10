import type { DamageType } from "@system/damage/types.ts";
import { DAMAGE_DICE_FACES, DAMAGE_TYPES } from "@system/damage/values.ts";
import { setHasElement, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import { AELikeRuleElement, type AELikeChangeMode } from "../ae-like.ts";
import type { ModelPropsFromRESchema, RuleElementSchema } from "../data.ts";
import { ResolvableValueField, RuleElement } from "../index.ts";
import { DamageAlteration } from "./alteration.ts";
import fields = foundry.data.fields;
import DataModelValidationFailure = foundry.data.validation.DataModelValidationFailure;

/** Alter certain aspects of individual components (modifiers and dice) of a damage roll. */
class DamageAlterationRuleElement extends RuleElement<DamageAlterationSchema> {
    static override autogenForms = true;

    static override defineSchema(): DamageAlterationSchema {
        return {
            ...super.defineSchema(),
            selectors: new fields.SetField(new fields.StringField({ required: true, blank: false }), { min: 1 }),
            mode: new fields.StringField({
                required: true,
                choices: R.keys(AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES),
                initial: "add",
            }),
            property: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["damage-type", "dice-faces", "dice-number", "tags"],
            }),
            value: new ResolvableValueField({
                required: true,
                nullable: true,
                initial: null,
                validate: (value, options): boolean | DataModelValidationFailure => {
                    if (typeof value === "string" && /^\{\w+\|.+\}$/.test(value)) return true;
                    switch (options.source?.property) {
                        case "damage-type":
                            if (!setHasElement(DAMAGE_TYPES, value)) {
                                throw Error("must be a damage type or resolvable to one");
                            }
                            break;
                        case "dice-faces": {
                            if (typeof value === "string" && /|@.+\..+/.test(value)) return true;
                            const faces = Number(value);
                            if (!Number.isInteger(faces)) throw Error("must be an integer or resolvable to one");
                            if (options.source?.mode === "override" && !tupleHasValue(DAMAGE_DICE_FACES, faces)) {
                                const listFormatter = game.i18n.getListFormatter({ type: "disjunction" });
                                const list = listFormatter.format(DAMAGE_DICE_FACES.map((f) => f.toString()));
                                throw Error(`must override dice faces to ${list}`);
                            }
                            break;
                        }
                        case "dice-number": {
                            if (typeof value === "string" && /|@.+\..+/.test(value)) return true;
                            const number = Number(value);
                            if (!Number.isInteger(number)) throw Error("must be an integer or resolvable to one");
                        }
                    }
                    return true;
                },
            }),
            relabel: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
        };
    }

    static override LOCALIZATION_PREFIXES = ["PF2E.RULES.Common", "PF2E.RULES.DamageAlteration"];

    override resolveValue(
        value: unknown,
        defaultValue: null,
        options: { resolvables: Record<string, unknown> },
    ): DamageAlterationValue | null;
    override resolveValue(
        value: unknown,
        defaultValue: null,
        options: { resolvables: Record<string, unknown> },
    ): number | string | string[] | null {
        const resolved = super.resolveValue(value, defaultValue, options);
        if (this.ignored) return null;
        const isMalformed = !(
            typeof resolved === "number" ||
            typeof resolved === "string" ||
            Array.isArray(resolved) ||
            resolved === null
        );
        if (isMalformed) return null;

        const damageTypes: Set<string> = DAMAGE_TYPES;
        const isValid = {
            "damage-type": typeof resolved === "string" && damageTypes.has(resolved),
            "dice-faces": resolved === null || tupleHasValue(DAMAGE_DICE_FACES, resolved),
            "dice-number": typeof resolved === "number" && Number.isInteger(resolved) && resolved.between(0, 99),
            tags:
                (typeof resolved === "string" && resolved === sluggify(resolved)) ||
                (Array.isArray(resolved) && resolved.every((t) => typeof t === "string" && t === sluggify(t))),
        };

        if (!isValid[this.property]) {
            const message = {
                "damage-type": `value: must be a damage type (resolved to ${resolved})`,
                "dice-faces": `value: must be one of 4, 6, 8, 10, and 12 (resolved to ${resolved})`,
                "dice-number": `value: must be a positive integer less than 100 (resolved to ${resolved})`,
                tags: `value: must be a slug or array of slugs (resolved to ${resolved})`,
            };
            this.failValidation(message[this.property]);
            return null;
        }

        return resolved;
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const alteration = new DamageAlteration(this);
        const selectors = this.selectors.values().toArray();
        for (const selector of this.resolveInjectedProperties(selectors)) {
            const synthetics = (this.actor.synthetics.damageAlterations[selector] ??= []);
            synthetics.push(alteration);
        }
    }
}

interface DamageAlterationRuleElement
    extends RuleElement<DamageAlterationSchema>,
        ModelPropsFromRESchema<DamageAlterationSchema> {}

type DamageAlterationProperty = "dice-faces" | "dice-number" | "damage-type" | "tags";

type DamageAlterationSchema = RuleElementSchema & {
    selectors: fields.SetField<fields.StringField<string, string, true, false, false>>;
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, true>;
    property: fields.StringField<DamageAlterationProperty, DamageAlterationProperty, true, false, false>;
    value: ResolvableValueField<true, true, true>;
    /** An optional relabeling of the altered unit of damage */
    relabel: fields.StringField<string, string, false, true, true>;
};

type DamageAlterationSource = fields.SourceFromSchema<DamageAlterationSchema>;

type DamageAlterationValue = DamageType | number | string[];

export { DamageAlterationRuleElement };
export type { DamageAlterationProperty, DamageAlterationSource, DamageAlterationValue };
